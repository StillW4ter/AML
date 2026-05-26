/**
 * /api/v1/channels — connected senders (Gmail mailboxes, SMS sender,
 * WhatsApp sessions), per-channel configuration status, and SMS balance.
 */
import { prisma } from "@/lib/db";
import { requireScope, isAuthError } from "@/lib/api/auth";
import { ok } from "@/lib/api/respond";
import { channelStatus } from "@/lib/messaging";
import { activeGateway } from "@/lib/messaging/sms";
import { listSessions } from "@/lib/messaging/whatsapp";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireScope(req, "leads:read");
  if (isAuthError(auth)) return auth;

  const channels = await prisma.channel.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      provider: true,
      label: true,
      identifier: true,
      status: true,
      userId: true,
      createdAt: true,
      // credentials deliberately omitted
    },
  });

  const smsBalance = await activeGateway().getBalance();

  return ok({
    channels,
    status: channelStatus(),
    smsBalance,
    whatsappSessions: listSessions(),
  });
}
