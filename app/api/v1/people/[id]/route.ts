/** /api/v1/people/{id} — get, update, delete a contact. */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireScope, isAuthError } from "@/lib/api/auth";
import { ok, fail, errors, readJson } from "@/lib/api/respond";
import { personInput, flattenZod } from "@/lib/api/validation";
import { normalizePhone } from "@/lib/crm/util";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const auth = await requireScope(req, "leads:read");
  if (isAuthError(auth)) return auth;

  const { id } = await ctx.params;
  const person = await prisma.person.findUnique({
    where: { id },
    include: {
      company: true,
      deals: { include: { stage: true }, orderBy: { createdAt: "desc" } },
      messages: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!person) return errors.notFound("Person");
  return ok(person);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireScope(req, "leads:write");
  if (isAuthError(auth)) return auth;

  const { id } = await ctx.params;
  const parsed = personInput.partial().safeParse(await readJson(req));
  if (!parsed.success) return errors.validation(flattenZod(parsed.error));
  const d = parsed.data;

  const exists = await prisma.person.findUnique({ where: { id } });
  if (!exists) return errors.notFound("Person");

  const person = await prisma.person.update({
    where: { id },
    data: {
      name: d.name,
      nameKa: d.nameKa,
      email: d.email?.toLowerCase(),
      phone: d.phone ? normalizePhone(d.phone) : undefined,
      city: d.city,
      cityKa: d.cityKa,
      source: d.source,
      companyId: d.companyId,
      consent: d.consent
        ? (d.consent as unknown as Prisma.InputJsonValue)
        : undefined,
    },
  });
  return ok(person);
}

export async function DELETE(req: Request, ctx: Ctx) {
  const auth = await requireScope(req, "leads:write");
  if (isAuthError(auth)) return auth;

  const { id } = await ctx.params;
  const exists = await prisma.person.findUnique({
    where: { id },
    include: { _count: { select: { deals: true } } },
  });
  if (!exists) return errors.notFound("Person");

  if (exists._count.deals > 0) {
    return fail(
      "conflict",
      "Cannot delete a contact that still has deals. Close or reassign them first.",
      409,
    );
  }

  await prisma.person.delete({ where: { id } });
  return ok({ deleted: true, id });
}
