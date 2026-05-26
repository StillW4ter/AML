/** /api/v1/companies — list and create companies (commercial insurance). */
import { prisma } from "@/lib/db";
import { requireScope, isAuthError } from "@/lib/api/auth";
import { ok, created, errors, readJson } from "@/lib/api/respond";
import { companyInput, flattenZod } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireScope(req, "leads:read");
  if (isAuthError(auth)) return auth;

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);

  const companies = await prisma.company.findMany({
    where: q ? { name: { contains: q } } : undefined,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { people: true, deals: true } } },
  });
  return ok({ data: companies, count: companies.length });
}

export async function POST(req: Request) {
  const auth = await requireScope(req, "leads:write");
  if (isAuthError(auth)) return auth;

  const parsed = companyInput.safeParse(await readJson(req));
  if (!parsed.success) return errors.validation(flattenZod(parsed.error));

  const company = await prisma.company.create({ data: parsed.data });
  return created(company);
}
