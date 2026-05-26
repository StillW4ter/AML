/** /api/v1/pipelines — pipelines, their ordered stages, and deal counts. */
import { prisma } from "@/lib/db";
import { requireScope, isAuthError } from "@/lib/api/auth";
import { ok } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireScope(req, "leads:read");
  if (isAuthError(auth)) return auth;

  const pipelines = await prisma.pipeline.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      stages: {
        orderBy: { position: "asc" },
        include: { _count: { select: { deals: true } } },
      },
    },
  });
  return ok({ data: pipelines });
}
