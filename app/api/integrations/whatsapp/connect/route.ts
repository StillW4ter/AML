/**
 * Start (or resume) an agent's WhatsApp Web session.
 *
 * Returns immediately — poll GET /api/integrations/whatsapp/{agentId}/qr for
 * the QR code to scan and the eventual `connected` status.
 */
import { ok, errors, readJson } from "@/lib/api/respond";
import { startSession } from "@/lib/messaging/whatsapp";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await readJson<{ agentId?: string }>(req);
  const agentId = body?.agentId?.trim();
  if (!agentId) {
    return errors.validation({ agentId: "agentId is required" });
  }

  const status = await startSession(agentId);
  return ok({ agentId, ...status });
}
