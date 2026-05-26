/** /api/v1/leads/{id} — full deal record, and field updates. */
import { prisma } from "@/lib/db";
import { requireScope, isAuthError } from "@/lib/api/auth";
import { ok, errors, readJson } from "@/lib/api/respond";
import { leadUpdateInput, flattenZod } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Accept either the deal id or its human reference (LD-1024). */
async function findDeal(idOrRef: string) {
  return prisma.deal.findFirst({
    where: { OR: [{ id: idOrRef }, { reference: idOrRef }] },
    include: {
      person: { include: { company: true } },
      stage: true,
      pipeline: { include: { stages: { orderBy: { position: "asc" } } } },
      owner: { select: { id: true, name: true, role: true } },
      profile: true,
      quotes: { orderBy: { createdAt: "desc" } },
      tasks: { orderBy: { dueAt: "asc" } },
      activities: { orderBy: { createdAt: "desc" }, take: 50 },
      messages: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
}

export async function GET(req: Request, ctx: Ctx) {
  const auth = await requireScope(req, "leads:read");
  if (isAuthError(auth)) return auth;

  const { id } = await ctx.params;
  const deal = await findDeal(id);
  if (!deal) return errors.notFound("Deal");
  return ok(deal);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireScope(req, "leads:write");
  if (isAuthError(auth)) return auth;

  const { id } = await ctx.params;
  const parsed = leadUpdateInput.safeParse(await readJson(req));
  if (!parsed.success) return errors.validation(flattenZod(parsed.error));

  const existing = await prisma.deal.findUnique({ where: { id } });
  if (!existing) return errors.notFound("Deal");

  const deal = await prisma.deal.update({
    where: { id },
    data: parsed.data,
    include: { person: true, stage: true, profile: true },
  });
  return ok(deal);
}
