/**
 * Email channel — Gmail API over OAuth2, implemented with plain `fetch`
 * (no SDK dependency).
 *
 * OAuth: authorization-code flow. Tokens are stored encrypted on the agent's
 * Channel row. Send: gmail.users.messages.send with a base64url MIME message.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { configured, env } from "@/lib/env";
import { encryptJson, decryptJson } from "@/lib/secure";
import type { ChannelAdapter, OutboundMessage, SendResult } from "./types";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

interface GmailCredentials {
  accessToken: string;
  refreshToken: string;
  /** Epoch ms when the access token expires. */
  expiryDate: number;
  email?: string;
}

// --- OAuth -----------------------------------------------------------------

/** Build the Google consent URL the agent is redirected to. */
export function buildAuthUrl(state: string): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.google.clientId ?? "");
  url.searchParams.set("redirect_uri", env.google.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GMAIL_SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

async function tokenRequest(
  params: Record<string, string>,
): Promise<{ access_token: string; refresh_token?: string; expires_in: number }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.google.clientId ?? "",
      client_secret: env.google.clientSecret ?? "",
      ...params,
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token request failed: ${await res.text()}`);
  }
  return res.json();
}

/** Exchange the OAuth code for tokens and persist a connected Channel. */
export async function exchangeCodeAndStore(
  code: string,
  userId?: string,
): Promise<{ channelId: string; email?: string }> {
  const token = await tokenRequest({
    code,
    grant_type: "authorization_code",
    redirect_uri: env.google.redirectUri,
  });

  // Fetch the mailbox address for the channel label.
  let email: string | undefined;
  try {
    const profile = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { authorization: `Bearer ${token.access_token}` } },
    );
    if (profile.ok) email = ((await profile.json()) as { email?: string }).email;
  } catch {
    /* non-fatal */
  }

  const credentials: GmailCredentials = {
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? "",
    expiryDate: Date.now() + token.expires_in * 1000,
    email,
  };

  const channel = await prisma.channel.create({
    data: {
      type: "email",
      provider: "gmail",
      label: email ? `Gmail · ${email}` : "Gmail",
      identifier: email,
      status: "connected",
      userId,
      credentials: encryptJson(credentials) as unknown as Prisma.InputJsonValue,
    },
  });
  return { channelId: channel.id, email };
}

// --- Sending ---------------------------------------------------------------

async function freshAccessToken(channelId: string): Promise<{
  accessToken: string;
  from: string;
} | null> {
  const channel = await prisma.channel.findUnique({ where: { id: channelId } });
  if (!channel?.credentials) return null;

  const creds = decryptJson<GmailCredentials>(channel.credentials as string);

  if (Date.now() < creds.expiryDate - 60_000) {
    return { accessToken: creds.accessToken, from: creds.email ?? "" };
  }

  // Refresh.
  const token = await tokenRequest({
    refresh_token: creds.refreshToken,
    grant_type: "refresh_token",
  });
  const updated: GmailCredentials = {
    ...creds,
    accessToken: token.access_token,
    expiryDate: Date.now() + token.expires_in * 1000,
  };
  await prisma.channel.update({
    where: { id: channelId },
    data: {
      credentials: encryptJson(updated) as unknown as Prisma.InputJsonValue,
    },
  });
  return { accessToken: token.access_token, from: updated.email ?? "" };
}

function buildMime(from: string, to: string, subject: string, body: string): string {
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    body,
  ];
  return Buffer.from(lines.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Pick the Gmail channel to send from — the agent's, else any connected one. */
async function resolveChannel(agentId?: string) {
  if (agentId) {
    const own = await prisma.channel.findFirst({
      where: { provider: "gmail", status: "connected", userId: agentId },
    });
    if (own) return own;
  }
  return prisma.channel.findFirst({
    where: { provider: "gmail", status: "connected" },
  });
}

export const gmailAdapter: ChannelAdapter = {
  channel: "email",
  isConfigured: () => configured.gmail,

  async send(msg: OutboundMessage): Promise<SendResult> {
    if (!configured.gmail) {
      return {
        ok: true,
        status: "mock",
        raw: { to: msg.to, subject: msg.subject, note: "Gmail not configured" },
      };
    }

    const channel = await resolveChannel(msg.agentId);
    if (!channel) {
      return {
        ok: true,
        status: "mock",
        raw: { note: "No connected Gmail mailbox — connect one in Settings" },
      };
    }

    try {
      const token = await freshAccessToken(channel.id);
      if (!token) return { ok: false, status: "failed", error: "no_credentials" };

      const raw = buildMime(
        token.from,
        msg.to,
        msg.subject ?? "(no subject)",
        msg.body,
      );
      const res = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${token.accessToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ raw }),
        },
      );
      const json = (await res.json()) as { id?: string };
      if (!res.ok) {
        return { ok: false, status: "failed", error: JSON.stringify(json) };
      }
      return { ok: true, status: "sent", providerId: json.id, raw: json };
    } catch (err) {
      return { ok: false, status: "failed", error: (err as Error).message };
    }
  },
};
