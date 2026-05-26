/** /api/v1/activities — log a timeline entry (call, note, status, …). */
import { requireScope, isAuthError } from "@/lib/api/auth";
import { created, errors, readJson } from "@/lib/api/respond";
import { activityInput, flattenZod } from "@/lib/api/validation";
import { logActivity } from "@/lib/crm/activity";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requireScope(req, "leads:write");
  if (isAuthError(auth)) return auth;

  const parsed = activityInput.safeParse(await readJson(req));
  if (!parsed.success) return errors.validation(flattenZod(parsed.error));
  const d = parsed.data;

  if (d.dealId) {
    const deal = await prisma.deal.findUnique({ where: { id: d.dealId } });
    if (!deal) return errors.notFound("Deal");
  }

  const activity = await logActivity({
    dealId: d.dealId,
    personId: d.personId,
    type: d.type,
    title: d.title,
    titleKa: d.titleKa,
    body: d.body,
    bodyKa: d.bodyKa,
    authorId: d.authorId,
    authorName: d.authorName,
  });
  return created(activity);
}
