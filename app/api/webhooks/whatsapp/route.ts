/**
 * WhatsApp inbound / status webhook.
 *
 * Live WhatsApp messages are delivered in-process by the Baileys adapter
 * (lib/messaging/whatsapp.ts) which calls `recordInbound` directly. This
 * endpoint is a manual injector for testing and a relay point for any
 * external WhatsApp service. Guarded by the X-Ingest-Secret header.
 */
import { verifyIngestSecret } from "@/lib/api/auth";
import { ok, fail, errors, readJson } from "@/lib/api/respond";
import { recordInbound, updateMessageStatus } from "@/lib/messaging";

export const dynamic = "force-dynamic";

interface Payload {
  from?: string;
  body?: string;
  providerId?: string;
  status?: "delivered" | "read" | "failed";
}

export async function POST(req: Request) {
  if (!verifyIngestSecret(req)) {
    return fail("unauthorized", "Missing or invalid X-Ingest-Secret", 401);
  }

  const body = await readJson<Payload>(req);
  if (!body) return errors.validation({ _: "Expected a JSON body" });

  if (body.from && body.body) {
    const result = await recordInbound({
      channel: "whatsapp",
      from: body.from,
      body: body.body,
      providerId: body.providerId,
      receivedAt: new Date(),
    });
    return ok({ received: true, ...result });
  }

  if (body.providerId && body.status) {
    const updated = await updateMessageStatus(body.providerId, body.status);
    return ok({ statusUpdated: updated });
  }

  return errors.validation({ _: "Provide {from, body} or {providerId, status}" });
}
