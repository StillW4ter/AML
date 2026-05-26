/** Lead ingestion: dedupe the person, open a deal, assign an owner. */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalizePhone, nextDealReference } from "./util";
import { buildProfileFields, countMissing } from "./fields";
import { logActivity } from "./activity";
import { dispatchEvent } from "@/lib/webhooks/outbound";
import type { IngestLeadInput } from "@/lib/api/validation";

export interface IngestResult {
  dealId: string;
  personId: string;
  reference: string;
  /** True when the contact already existed and was matched by phone/email. */
  duplicatePerson: boolean;
}

/** The default pipeline with its stages, ordered. */
export async function getDefaultPipeline() {
  const ordered = { stages: { orderBy: { position: "asc" as const } } };
  return (
    (await prisma.pipeline.findFirst({
      where: { isDefault: true },
      include: ordered,
    })) ?? (await prisma.pipeline.findFirst({ include: ordered }))
  );
}

/** Assign an owner — explicit preference, else the agent with the fewest open deals. */
async function pickOwner(preferredId?: string): Promise<string | undefined> {
  if (preferredId) {
    const user = await prisma.user.findUnique({ where: { id: preferredId } });
    if (user) return user.id;
  }
  const agents = await prisma.user.findMany({ where: { active: true } });
  if (!agents.length) return undefined;

  const load = await Promise.all(
    agents.map(async (a: { id: string }) => ({
      id: a.id,
      open: await prisma.deal.count({
        where: { ownerId: a.id, status: "open" },
      }),
    })),
  );
  load.sort((a, b) => a.open - b.open);
  return load[0]?.id;
}

export async function ingestLead(input: IngestLeadInput): Promise<IngestResult> {
  const phone = normalizePhone(input.person.phone);
  const email = input.person.email?.toLowerCase();

  // --- Deduplicate the contact: phone first, then email --------------------
  let person =
    (phone && (await prisma.person.findFirst({ where: { phone } }))) || null;
  if (!person && email) {
    person = await prisma.person.findFirst({ where: { email } });
  }
  const duplicatePerson = Boolean(person);

  const consent = input.person.consent as Prisma.InputJsonValue | undefined;

  if (person) {
    person = await prisma.person.update({
      where: { id: person.id },
      data: {
        nameKa: input.person.nameKa ?? person.nameKa,
        email: email ?? person.email,
        phone: phone ?? person.phone,
        city: input.person.city ?? person.city,
        consent,
      },
    });
  } else {
    person = await prisma.person.create({
      data: {
        name: input.person.name,
        nameKa: input.person.nameKa,
        email,
        phone,
        phoneRaw: input.person.phone,
        city: input.person.city,
        cityKa: input.person.cityKa,
        source: input.person.source ?? input.source,
        companyId: input.person.companyId,
        consent,
      },
    });
  }

  // --- Open the deal in the first stage ------------------------------------
  const pipeline = await getDefaultPipeline();
  if (!pipeline || !pipeline.stages.length) {
    throw new Error(
      "No pipeline configured. Run `npm run db:seed` to create one.",
    );
  }
  const firstStage = pipeline.stages[0];
  const reference = await nextDealReference();
  const ownerId = await pickOwner(input.ownerId ?? undefined);
  const fields = buildProfileFields(input.lineOfBusiness, input.profile ?? {});

  const deal = await prisma.deal.create({
    data: {
      reference,
      title: input.request ?? `${input.lineOfBusiness} — ${person.name}`,
      lineOfBusiness: input.lineOfBusiness,
      request: input.request,
      requestKa: input.requestKa,
      estimatedValue: input.estimatedValue,
      currency: input.currency ?? "GEL",
      source: input.source ?? input.person.source,
      personId: person.id,
      pipelineId: pipeline.id,
      stageId: firstStage.id,
      ownerId,
      profile: {
        create: {
          lob: input.lineOfBusiness,
          fields: fields as unknown as Prisma.InputJsonValue,
        },
      },
    },
  });

  await logActivity({
    dealId: deal.id,
    personId: person.id,
    type: "system",
    title: `Lead created from ${input.source ?? "API"}`,
    titleKa: "ლიდი შეიქმნა",
    authorName: "System",
    meta: { missing: countMissing(fields) },
  });

  await dispatchEvent("lead.created", {
    dealId: deal.id,
    personId: person.id,
    reference,
    lineOfBusiness: input.lineOfBusiness,
  });

  return { dealId: deal.id, personId: person.id, reference, duplicatePerson };
}

/** Open a new insurance (deal) for an existing contact. */
export async function createInsuranceForPerson(
  personId: string,
  lineOfBusiness: string,
  request?: string,
): Promise<{ dealId: string; reference: string } | null> {
  const person = await prisma.person.findUnique({ where: { id: personId } });
  if (!person) return null;

  const pipeline = await getDefaultPipeline();
  if (!pipeline || !pipeline.stages.length) {
    throw new Error("No pipeline configured. Run `npm run db:seed`.");
  }
  const firstStage = pipeline.stages[0];
  const reference = await nextDealReference();
  const ownerId = await pickOwner(undefined);
  const fields = buildProfileFields(lineOfBusiness, {});

  const deal = await prisma.deal.create({
    data: {
      reference,
      title: request?.trim() || `${lineOfBusiness} — ${person.name}`,
      lineOfBusiness,
      request: request?.trim() || undefined,
      currency: "GEL",
      source: "Existing contact",
      personId: person.id,
      pipelineId: pipeline.id,
      stageId: firstStage.id,
      ownerId,
      profile: {
        create: {
          lob: lineOfBusiness,
          fields: fields as unknown as Prisma.InputJsonValue,
        },
      },
    },
  });

  await logActivity({
    dealId: deal.id,
    personId: person.id,
    type: "system",
    title: `Insurance opened — ${lineOfBusiness}`,
    titleKa: "ახალი დაზღვევა",
    authorName: "System",
  });
  await dispatchEvent("lead.created", {
    dealId: deal.id,
    personId: person.id,
    reference,
    lineOfBusiness,
  });

  return { dealId: deal.id, reference };
}
