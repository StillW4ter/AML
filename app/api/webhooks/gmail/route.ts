/**
 * Gmail push notifications (Google Pub/Sub).
 *
 * After `users.watch`, Gmail publishes a Pub/Sub message whenever a mailbox
 * changes. Pub/Sub POSTs { message: { data }, subscription } here; `data`
 * base64-decodes to { emailAddress, historyId }.
 *
 * The handler acknowledges fast (204) and records the latest historyId on
 * the channel. Fetching the new messages via gmail.history.list and storing
 * them with `recordInbound` is the v0.2 follow-up.
 */
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface PubSubPush {
  message?: { data?: string };
  subscription?: string;
}

export async function POST(req: Request) {
  let body: PubSubPush | null = null;
  try {
    body = (await req.json()) as PubSubPush;
  } catch {
    return new Response(null, { status: 204 });
  }

  const raw = body?.message?.data;
  if (raw) {
    try {
      const decoded = JSON.parse(
        Buffer.from(raw, "base64").toString("utf8"),
      ) as { emailAddress?: string; historyId?: string | number };

      if (decoded.emailAddress) {
        const channel = await prisma.channel.findFirst({
          where: { provider: "gmail", identifier: decoded.emailAddress },
        });
        if (channel) {
          await prisma.channel.update({
            where: { id: channel.id },
            data: {
              meta: { lastHistoryId: String(decoded.historyId ?? "") },
            },
          });
          // TODO v0.2: gmail.users.history.list → recordInbound for new mail.
        }
      }
    } catch {
      /* malformed payload — still acknowledge so Pub/Sub stops retrying */
    }
  }

  return new Response(null, { status: 204 });
}
