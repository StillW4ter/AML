/**
 * Inbound SMS + delivery reports from the SMS gateway (smsoffice.ge).
 *
 * Gateways differ in payload shape, so this reads loosely from the query
 * string and/or JSON body:
 *   - { from, content }            → an inbound SMS
 *   - { messageId, status }        → a delivery report
 * Protected by SMS_WEBHOOK_SECRET passed as ?secret= or X-Sms-Secret.
 */
import { env } from "@/lib/env";
import { ok, fail } from "@/lib/api/respond";
import { recordInbound, updateMessageStatus } from "@/lib/messaging";

export const dynamic = "force-dynamic";

function authorized(req: Request, url: URL): boolean {
  if (!env.sms.webhookSecret) return true; // not configured → accept (dev)
  const provided =
    url.searchParams.get("secret") ?? req.headers.get("x-sms-secret") ?? "";
  return provided === env.sms.webhookSecret;
}

async function params(req: Request, url: URL): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  url.searchParams.forEach((v, k) => (out[k] = v));
  if (req.method === "POST") {
    try {
      const ct = req.headers.get("content-type") ?? "";
      if (ct.includes("application/json")) {
        Object.assign(out, (await req.json()) as Record<string, string>);
      } else {
        const form = await req.formData();
        form.forEach((v, k) => (out[k] = String(v)));
      }
    } catch {
      /* ignore malformed body */
    }
  }
  return out;
}

async function handle(req: Request): Promise<Response> {
  const url = new URL(req.url);
  if (!authorized(req, url)) {
    return fail("unauthorized", "Invalid SMS webhook secret", 401);
  }

  const p = await params(req, url);
  const from = p.from ?? p.sender ?? p.msisdn;
  const content = p.content ?? p.text ?? p.message;
  const messageId = p.messageId ?? p.id;
  const status = p.status ?? p.deliveryStatus;

  if (from && content) {
    const result = await recordInbound({
      channel: "sms",
      from,
      body: content,
      providerId: messageId,
      receivedAt: new Date(),
      meta: { raw: p },
    });
    return ok({ received: true, ...result });
  }

  if (messageId && status) {
    const mapped =
      /deliver/i.test(status) ? "delivered"
      : /read|seen/i.test(status) ? "read"
      : "failed";
    const updated = await updateMessageStatus(messageId, mapped);
    return ok({ statusUpdated: updated });
  }

  return ok({ ignored: true });
}

export const GET = handle;
export const POST = handle;
