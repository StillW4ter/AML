/** /api/v1/leads/{id}/activities — the deal's timeline. */
import { prisma } from "@/lib/db";
import { requireScope, isAuthError } from "@/lib/api/auth";
import { ok, errors } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const auth = await requireScope(req, "leads:read");
  if (isAuthError(auth)) return auth;

  const { id } = await ctx.params;
  const deal = await prisma.deal.findUnique({ where: { id } });
  if (!deal) return errors.notFound("Deal");

  const activities = await prisma.activity.findMany({
    where: { dealId: id },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, name: true } } },
  });
  return ok({ data: activities, count: activities.length });
}
