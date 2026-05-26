/**
 * /api/v1/leads/{id}/stage — move a deal to another pipeline stage.
 *
 * The move is gate-checked: a stage may require quote-critical fields to be
 * filled first. A blocked move returns 422 with the missing field keys.
 */
import { prisma } from "@/lib/db";
import { requireScope, isAuthError } from "@/lib/api/auth";
import { ok, fail, errors, readJson } from "@/lib/api/respond";
import { stageMoveInput, flattenZod } from "@/lib/api/validation";
import { moveDealToStage } from "@/lib/crm/pipeline";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const auth = await requireScope(req, "leads:write");
  if (isAuthError(auth)) return auth;

  const { id } = await ctx.params;
  const parsed = stageMoveInput.safeParse(await readJson(req));
  if (!parsed.success) return errors.validation(flattenZod(parsed.error));

  const result = await moveDealToStage(id, parsed.data);

  if (!result.ok) {
    if (result.blocked) {
      return fail(
        "stage_gate_blocked",
        "Required fields are missing for this stage.",
        422,
        { missingFields: result.missingFields },
      );
    }
    return errors.notFound(
      result.error === "stage_not_found" ? "Stage" : "Deal",
    );
  }

  const deal = await prisma.deal.findUnique({
    where: { id },
    include: { stage: true, person: true },
  });
  return ok({ moved: true, stage: result.stage, status: result.status, deal });
}
