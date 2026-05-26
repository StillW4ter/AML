/** /api/v1/people — list / search and create contacts. */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireScope, isAuthError } from "@/lib/api/auth";
import { ok, created, errors, readJson } from "@/lib/api/respond";
import { personInput, flattenZod } from "@/lib/api/validation";
import { normalizePhone } from "@/lib/crm/util";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireScope(req, "leads:read");
  if (isAuthError(auth)) return auth;

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);

  const people = await prisma.person.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
          ],
        }
      : undefined,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { company: true, _count: { select: { deals: true } } },
  });

  return ok({ data: people, count: people.length });
}

export async function POST(req: Request) {
  const auth = await requireScope(req, "leads:write");
  if (isAuthError(auth)) return auth;

  const parsed = personInput.safeParse(await readJson(req));
  if (!parsed.success) return errors.validation(flattenZod(parsed.error));
  const d = parsed.data;

  const person = await prisma.person.create({
    data: {
      name: d.name,
      nameKa: d.nameKa,
      email: d.email?.toLowerCase(),
      phone: normalizePhone(d.phone),
      phoneRaw: d.phone,
      city: d.city,
      cityKa: d.cityKa,
      source: d.source,
      companyId: d.companyId,
      consent: d.consent
        ? (d.consent as unknown as Prisma.InputJsonValue)
        : undefined,
    },
  });

  return created(person);
}
