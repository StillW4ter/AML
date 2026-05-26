/**
 * WhatsApp channel — per-agent WhatsApp Web sessions via Baileys.
 *
 * Each worker links *their own* WhatsApp by scanning a QR code, exactly like
 * WhatsApp Web. One Node process holds many agents' sessions (Baileys speaks
 * the WhatsApp Web protocol over WebSocket — no headless browser).
 *
 * Baileys is an OPTIONAL dependency, loaded dynamically. With it absent or
 * WHATSAPP_ENABLED=false the adapter runs in mock mode.
 *
 *   npm install @whiskeysockets/baileys
 *
 * Caveat: Baileys is an unofficial client. Use a dedicated agent number and
 * human-paced volume. For marketing-scale sending, swap in the official
 * WhatsApp Business Cloud API — this adapter's interface stays the same.
 */
import { configured, env } from "@/lib/env";
import { recordInbound } from "./inbound";
import type { ChannelAdapter, OutboundMessage, SendResult } from "./types";

interface WaSession {
  agentId: string;
  sock: unknown;
  status: "pending" | "connected" | "disconnected" | "error";
  /** Latest QR payload — render client-side for the agent to scan. */
  qr?: string;
  phone?: string;
  lastError?: string;
  startedAt: number;
}

/** In-memory session registry, keyed by agent id. */
const sessions = new Map<string, WaSession>();

async function loadBaileys(): Promise<Record<string, unknown> | null> {
  if (!configured.whatsapp) return null;
  try {
    // String-typed specifier: kept out of the build graph on purpose.
    const moduleName: string = "@whiskeysockets/baileys";
    return (await import(moduleName)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function jidFor(phone: string): string {
  return `${phone.replace(/\D/g, "")}@s.whatsapp.net`;
}

export interface SessionStatus {
  status: WaSession["status"] | "not_started";
  qr?: string;
  phone?: string;
  error?: string;
}

export function getSessionStatus(agentId: string): SessionStatus {
  const s = sessions.get(agentId);
  if (!s) return { status: "not_started" };
  return { status: s.status, qr: s.qr, phone: s.phone, error: s.lastError };
}

export function listSessions(): Array<{ agentId: string } & SessionStatus> {
  return [...sessions.values()].map((s) => ({
    agentId: s.agentId,
    status: s.status,
    qr: s.qr,
    phone: s.phone,
    error: s.lastError,
  }));
}

/**
 * Start (or resume) an agent's WhatsApp session. Returns immediately — poll
 * `getSessionStatus` for the QR code and the eventual `connected` state.
 */
export async function startSession(agentId: string): Promise<SessionStatus> {
  const existing = sessions.get(agentId);
  if (existing && (existing.status === "connected" || existing.status === "pending")) {
    return getSessionStatus(agentId);
  }

  const session: WaSession = {
    agentId,
    sock: null,
    status: "pending",
    startedAt: Date.now(),
  };
  sessions.set(agentId, session);

  const baileys = await loadBaileys();
  if (!baileys) {
    session.status = "disconnected";
    session.lastError =
      "Baileys unavailable — run `npm install @whiskeysockets/baileys` and set WHATSAPP_ENABLED=true.";
    return getSessionStatus(agentId);
  }

  try {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const b = baileys as any;
    const makeWASocket = b.default ?? b.makeWASocket;
    const useMultiFileAuthState = b.useMultiFileAuthState;
    const DisconnectReason = b.DisconnectReason ?? {};

    const dir = `${env.whatsapp.sessionDir}/${agentId}`;
    const { state, saveCreds } = await useMultiFileAuthState(dir);
    const sock = makeWASocket({ auth: state, printQRInTerminal: false });
    session.sock = sock;

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update: any) => {
      if (update.qr) session.qr = update.qr;
      if (update.connection === "open") {
        session.status = "connected";
        session.qr = undefined;
        session.phone = String(sock.user?.id ?? "").split(":")[0] || undefined;
      }
      if (update.connection === "close") {
        const code = update.lastDisconnect?.error?.output?.statusCode;
        if (code === DisconnectReason.loggedOut) {
          session.status = "disconnected";
          sessions.delete(agentId);
        } else {
          session.status = "pending";
          startSession(agentId).catch(() => undefined);
        }
      }
    });

    sock.ev.on("messages.upsert", async (event: any) => {
      if (event.type !== "notify") return;
      for (const m of event.messages ?? []) {
        if (m.key?.fromMe) continue;
        const from = String(m.key?.remoteJid ?? "").split("@")[0];
        const text: string =
          m.message?.conversation ??
          m.message?.extendedTextMessage?.text ??
          "";
        if (!from || !text) continue;
        await recordInbound({
          channel: "whatsapp",
          from: `+${from}`,
          body: text,
          providerId: m.key?.id,
          receivedAt: new Date(),
          meta: { agentId },
        }).catch(() => undefined);
      }
    });
    /* eslint-enable @typescript-eslint/no-explicit-any */
  } catch (err) {
    session.status = "error";
    session.lastError = (err as Error).message;
  }

  return getSessionStatus(agentId);
}

/** Drop a session and require re-pairing. */
export function endSession(agentId: string): void {
  const s = sessions.get(agentId);
  try {
    (s?.sock as { end?: (e?: unknown) => void } | null)?.end?.(undefined);
  } catch {
    /* ignore */
  }
  sessions.delete(agentId);
}

function pickSession(agentId?: string): WaSession | null {
  if (agentId) {
    const own = sessions.get(agentId);
    if (own?.status === "connected") return own;
  }
  for (const s of sessions.values()) {
    if (s.status === "connected") return s;
  }
  return null;
}

export const whatsappAdapter: ChannelAdapter = {
  channel: "whatsapp",
  isConfigured: () => configured.whatsapp,

  async send(msg: OutboundMessage): Promise<SendResult> {
    if (!configured.whatsapp) {
      return {
        ok: true,
        status: "mock",
        raw: { to: msg.to, note: "WHATSAPP_ENABLED=false — mock send" },
      };
    }
    const session = pickSession(msg.agentId);
    if (!session || !session.sock) {
      return {
        ok: true,
        status: "mock",
        raw: { note: "No connected WhatsApp session — agent must scan the QR" },
      };
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sock = session.sock as any;
      const result = await sock.sendMessage(jidFor(msg.to), { text: msg.body });
      return {
        ok: true,
        status: "sent",
        providerId: result?.key?.id,
        raw: result,
      };
    } catch (err) {
      return { ok: false, status: "failed", error: (err as Error).message };
    }
  },
};
