/**
 * /api/v1/messages — send a message (email / SMS / WhatsApp) and read history.
 *
 * Sends route through the unified messaging layer, so with no provider
 * credentials they are simulated (status: "mock") but still stored.
 */
import { prisma } from "@/lib/db";
import { requireScope, isAuthError } from "@/lib/api/auth";
import { ok, errors, readJson } from "@/lib/api/respond";
import { messageInput, flattenZod } from "@/lib/api/validation";
import { sendMessage } from "@/lib/messaging";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireScope(req, "leads:read");
  if (isAuthError(auth)) return auth;

  const url = new URL(req.url);
  const dealId = url.searchParams.get("dealId")?.trim();
  const channel = url.searchParams.get("channel")?.trim();
  const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);

  const messages = await prisma.message.findMany({
    where: {
      dealId: dealId || undefined,
      channel: channel || undefined,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return ok({ data: messages, count: messages.length });
}

export async function POST(req: Request) {
  const auth = await requireScope(req, "messages:send");
  if (isAuthError(auth)) return auth;

  const parsed = messageInput.safeParse(await readJson(req));
  if (!parsed.success) return errors.validation(flattenZod(parsed.error));
  const d = parsed.data;

  const { messageId, result } = await sendMessage({
    channel: d.channel,
    to: d.to,
    body: d.body,
    subject: d.subject,
    dealId: d.dealId,
    personId: d.personId,
    agentId: d.agentId,
    meta: d.urgent ? { urgent: true } : undefined,
  });

  return ok(
    {
      messageId,
      status: result.status,
      providerId: result.providerId,
      error: result.error,
    },
    result.ok ? 201 : 502,
  );
}
