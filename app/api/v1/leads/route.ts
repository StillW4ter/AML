/**
 * /api/v1/leads — list / filter deals, and create a deal.
 *
 * POST goes through the same `ingestLead` path as the public ingest webhook:
 * the contact is deduplicated, a deal is opened in the first stage, an owner
 * is assigned, and a `lead.created` webhook fires.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireScope, isAuthError } from "@/lib/api/auth";
import { ok, created, errors, readJson } from "@/lib/api/respond";
import { leadInput, flattenZod } from "@/lib/api/validation";
import { ingestLead } from "@/lib/crm/leads";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireScope(req, "leads:read");
  if (isAuthError(auth)) return auth;

  const url = new URL(req.url);
  const status = url.searchParams.get("status")?.trim();
  const stage = url.searchParams.get("stage")?.trim();
  const ownerId = url.searchParams.get("ownerId")?.trim();
  const lob = url.searchParams.get("lineOfBusiness")?.trim();
  const q = url.searchParams.get("q")?.trim();
  const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);

  const where: Prisma.DealWhereInput = {};
  if (status) where.status = status;
  if (ownerId) where.ownerId = ownerId;
  if (lob) where.lineOfBusiness = lob;
  if (stage) where.stage = { name: stage };
  if (q) {
    where.OR = [
      { reference: { contains: q } },
      { title: { contains: q } },
      { person: { name: { contains: q } } },
    ];
  }

  const deals = await prisma.deal.findMany({
    where,
    take: limit,
    orderBy: { updatedAt: "desc" },
    include: {
      person: true,
      stage: true,
      owner: { select: { id: true, name: true, role: true } },
      profile: { select: { lob: true, premiumEstimate: true } },
    },
  });
  return ok({ data: deals, count: deals.length });
}

export async function POST(req: Request) {
  const auth = await requireScope(req, "leads:write");
  if (isAuthError(auth)) return auth;

  const parsed = leadInput.safeParse(await readJson(req));
  if (!parsed.success) return errors.validation(flattenZod(parsed.error));

  try {
    const result = await ingestLead(parsed.data);
    const deal = await prisma.deal.findUnique({
      where: { id: result.dealId },
      include: { person: true, stage: true, profile: true },
    });
    return created({ ...result, deal });
  } catch (err) {
    return errors.server((err as Error).message);
  }
}
