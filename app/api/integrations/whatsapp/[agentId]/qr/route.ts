/**
 * Poll an agent's WhatsApp session: pairing QR string and connection status.
 * Render `qr` as a QR code for the agent to scan with WhatsApp → Linked
 * Devices. Once `status` is "connected" the QR is cleared.
 */
import { ok } from "@/lib/api/respond";
import { getSessionStatus } from "@/lib/messaging/whatsapp";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ agentId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { agentId } = await ctx.params;
  return ok({ agentId, ...getSessionStatus(agentId) });
}
