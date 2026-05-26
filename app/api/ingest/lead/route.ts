/**
 * API IN — public lead capture.
 *
 * The single front door for new leads: the website compare form, Google /
 * Meta lead-ad webhooks, partner feeds. Authenticated with a shared secret
 * in the `X-Ingest-Secret` header (set CRM_INGEST_SECRET).
 *
 *   POST /api/ingest/lead
 *   X-Ingest-Secret: <secret>
 *   { source, lineOfBusiness, request, person: {...}, profile: {...} }
 */
import { verifyIngestSecret } from "@/lib/api/auth";
import { created, errors, fail, readJson } from "@/lib/api/respond";
import { ingestLeadInput, flattenZod } from "@/lib/api/validation";
import { ingestLead } from "@/lib/crm/leads";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!verifyIngestSecret(req)) {
    return fail("unauthorized", "Missing or invalid X-Ingest-Secret", 401);
  }

  const parsed = ingestLeadInput.safeParse(await readJson(req));
  if (!parsed.success) return errors.validation(flattenZod(parsed.error));

  try {
    const result = await ingestLead(parsed.data);
    return created({
      dealId: result.dealId,
      personId: result.personId,
      reference: result.reference,
      duplicate: result.duplicatePerson,
    });
  } catch (err) {
    return errors.server((err as Error).message);
  }
}
