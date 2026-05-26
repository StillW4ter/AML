/**
 * /api/v1/webhooks — manage outbound webhook subscriptions.
 *
 * The CRM POSTs signed event payloads to each endpoint's URL. The signing
 * secret is returned once, on creation.
 */
import { prisma } from "@/lib/db";
import { requireScope, isAuthError } from "@/lib/api/auth";
import { ok, created, errors, readJson } from "@/lib/api/respond";
import { webhookInput, flattenZod } from "@/lib/api/validation";
import { randomToken } from "@/lib/crm/util";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireScope(req, "webhooks:manage");
  if (isAuthError(auth)) return auth;

  const endpoints = await prisma.webhookEndpoint.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      url: true,
      events: true,
      active: true,
      createdAt: true,
      _count: { select: { deliveries: true } },
    },
  });
  return ok({ data: endpoints });
}

export async function POST(req: Request) {
  const auth = await requireScope(req, "webhooks:manage");
  if (isAuthError(auth)) return auth;

  const parsed = webhookInput.safeParse(await readJson(req));
  if (!parsed.success) return errors.validation(flattenZod(parsed.error));

  const secret = `whsec_${randomToken(24)}`;
  const endpoint = await prisma.webhookEndpoint.create({
    data: {
      url: parsed.data.url,
      events: parsed.data.events.join(","),
      secret,
    },
  });

  // Secret is shown once — subscribers verify the X-Gurdena-Signature with it.
  return created({
    id: endpoint.id,
    url: endpoint.url,
    events: parsed.data.events,
    secret,
  });
}
