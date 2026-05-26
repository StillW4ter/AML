"use server";

/**
 * Server Actions for the CRM UI.
 *
 * The interface (Server Components + these actions) talks to the database
 * directly through the lib/crm + lib/messaging code — no API key needed.
 * The keyed /api/v1 REST API stays separate, for external integrations.
 */
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { moveDealToStage } from "@/lib/crm/pipeline";
import { logActivity } from "@/lib/crm/activity";
import { ingestLead, createInsuranceForPerson } from "@/lib/crm/leads";
import { getDealDetail, type DealDetailDTO } from "@/lib/crm/queries";
import { saveRenewalSchedule, type RenewalSchedule } from "@/lib/crm/settings";
import { ensureCustomizationSchema } from "@/lib/crm/ensure-schema";
import { sendMessage } from "@/lib/messaging";
import {
  createFlow,
  updateFlow,
  deleteFlow,
  createStep,
  updateStep,
  deleteStep,
  reorderSteps,
  type UpdateFlowPatch,
  type UpdateStepPatch,
  type CreateStepInput,
  type StepType,
} from "@/lib/quote/flows";
import type { Lang } from "@/lib/i18n";

const LOBS = ["auto", "health", "home", "travel", "pet", "commercial"] as const;
type Lob = (typeof LOBS)[number];


/** Reload one deal's full detail (used by the record panel). */
export async function getDealDetailAction(
  id: string,
): Promise<DealDetailDTO | null> {
  return getDealDetail(id);
}

/** Move a deal to another stage — returns the gate result so the UI can react. */
export async function moveStageAction(dealId: string, stageId: string) {
  const result = await moveDealToStage(dealId, { stageId });
  revalidatePath("/crm");
  return result;
}

/** Append a timeline entry. */
export async function logActivityAction(
  dealId: string,
  type: "call" | "note" | "sms" | "whatsapp" | "email",
  note: string,
) {
  const clean = note.trim();
  if (!clean) return { ok: false as const };
  await logActivity({
    dealId,
    type,
    title: clean.length > 80 ? `${clean.slice(0, 80)}…` : clean,
    body: clean,
    authorName: "Agent",
  });
  revalidatePath("/crm");
  return { ok: true as const };
}

/** Update (upsert) one underwriting field's value on the deal's profile. */
export async function updateFieldAction(
  dealId: string,
  key: string,
  value: string,
) {
  const profile = await prisma.insuranceProfile.findUnique({ where: { dealId } });
  if (!profile) return { ok: false as const };

  const arr = Array.isArray(profile.fields)
    ? [...(profile.fields as Array<Record<string, unknown>>)]
    : [];
  const entry = {
    key,
    value,
    source: value.trim() ? "agent" : "missing",
  };
  const idx = arr.findIndex((f) => f && f.key === key);
  if (idx >= 0) arr[idx] = { ...arr[idx], ...entry };
  else arr.push(entry);

  await prisma.insuranceProfile.update({
    where: { dealId },
    data: { fields: arr as unknown as Prisma.InputJsonValue },
  });
  revalidatePath("/crm");
  return { ok: true as const };
}

/** Reassign the owning agent. */
export async function assignOwnerAction(dealId: string, ownerId: string) {
  await prisma.deal.update({
    where: { id: dealId },
    data: { ownerId: ownerId || null },
  });
  revalidatePath("/crm");
  return { ok: true as const };
}

/** Send a message over email / SMS / WhatsApp through the messaging layer. */
export async function sendMessageAction(input: {
  dealId: string;
  channel: "email" | "sms" | "whatsapp";
  to: string;
  subject?: string;
  body: string;
}) {
  if (!input.to.trim() || !input.body.trim()) {
    return { ok: false as const, error: "Recipient and message are required" };
  }
  const deal = await prisma.deal.findUnique({ where: { id: input.dealId } });
  const { result } = await sendMessage({
    channel: input.channel,
    to: input.to.trim(),
    subject: input.subject,
    body: input.body,
    dealId: input.dealId,
    personId: deal?.personId,
  });
  revalidatePath("/crm");
  return { ok: result.ok, status: result.status, error: result.error };
}

/** Create a new lead / deal. */
export async function createLeadAction(input: {
  name: string;
  phone?: string;
  email?: string;
  lineOfBusiness: string;
  request?: string;
  source?: string;
}) {
  if (!input.name.trim()) {
    return { ok: false as const, error: "Name is required" };
  }
  const lob: Lob = (LOBS as readonly string[]).includes(input.lineOfBusiness)
    ? (input.lineOfBusiness as Lob)
    : "auto";

  const result = await ingestLead({
    lineOfBusiness: lob,
    request: input.request?.trim() || undefined,
    source: input.source?.trim() || "Manual",
    person: {
      name: input.name.trim(),
      phone: input.phone?.trim() || undefined,
      email: input.email?.trim() || undefined,
    },
  });
  revalidatePath("/crm");
  return { ok: true as const, dealId: result.dealId, reference: result.reference };
}

/** Edit a deal's core fields (title, request, estimated value). */
export async function updateDealAction(
  dealId: string,
  data: { title?: string; request?: string; estimatedValue?: number },
) {
  await prisma.deal.update({
    where: { id: dealId },
    data: {
      title: data.title?.trim() || undefined,
      request: data.request?.trim() ?? undefined,
      estimatedValue:
        typeof data.estimatedValue === "number" ? data.estimatedValue : undefined,
    },
  });
  revalidatePath("/crm");
  return { ok: true as const };
}

/** Move a deal into a Won/Lost stage, capturing close value or loss reason. */
export async function closeDealAction(
  dealId: string,
  stageId: string,
  extra: { closeValue?: number; lossReason?: string },
) {
  const result = await moveDealToStage(dealId, { stageId, force: true });
  if (result.ok) {
    await prisma.deal.update({
      where: { id: dealId },
      data: {
        closeValue:
          typeof extra.closeValue === "number" ? extra.closeValue : undefined,
        lossReason: extra.lossReason?.trim() || undefined,
      },
    });
  }
  revalidatePath("/crm");
  return result;
}

/** Add an insurer quote to a deal. */
export async function addQuoteAction(
  dealId: string,
  input: { insurer: string; premium: number; currency?: string },
) {
  if (!input.insurer.trim() || !(input.premium > 0)) {
    return { ok: false as const, error: "Insurer and a positive premium are required" };
  }
  await prisma.quote.create({
    data: {
      dealId,
      insurer: input.insurer.trim(),
      premium: input.premium,
      currency: input.currency ?? "GEL",
      status: "draft",
    },
  });
  revalidatePath("/crm");
  return { ok: true as const };
}

// --- Custom field definitions ----------------------------------------------

function slugify(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || `field_${Date.now()}`
  );
}

export async function createFieldDefAction(input: {
  labelEn: string;
  labelKa?: string;
  type: string;
  required?: boolean;
  lob: string;
}) {
  const labelEn = input.labelEn.trim();
  if (!labelEn) return { ok: false as const, error: "A field name is required" };
  const lob = input.lob ?? "";
  try {
    await ensureCustomizationSchema();
    const posRows = await prisma.$queryRaw<Array<{ m: number | bigint | null }>>`
      SELECT MAX("position") AS m FROM "FieldDefinition" WHERE "lob" = ${lob}`;
    const position = Number(posRows[0]?.m ?? -1) + 1;
    await prisma.$executeRaw`
      INSERT INTO "FieldDefinition"
        ("id", "key", "labelEn", "labelKa", "type", "required", "lob", "position")
      VALUES (${randomUUID()}, ${slugify(labelEn)}, ${labelEn},
              ${input.labelKa?.trim() || null}, ${input.type || "text"},
              ${input.required ? 1 : 0}, ${lob}, ${position})`;
  } catch {
    return {
      ok: false as const,
      error: "A field with that name already exists in this scope",
    };
  }
  revalidatePath("/crm");
  return { ok: true as const };
}

export async function updateFieldDefAction(
  id: string,
  data: { labelEn?: string; labelKa?: string; type?: string; required?: boolean },
) {
  try {
    await ensureCustomizationSchema();
    if (data.labelEn !== undefined && data.labelEn.trim()) {
      await prisma.$executeRaw`UPDATE "FieldDefinition"
        SET "labelEn" = ${data.labelEn.trim()}, "updatedAt" = datetime('now')
        WHERE "id" = ${id}`;
    }
    if (data.labelKa !== undefined) {
      await prisma.$executeRaw`UPDATE "FieldDefinition"
        SET "labelKa" = ${data.labelKa.trim() || null}, "updatedAt" = datetime('now')
        WHERE "id" = ${id}`;
    }
    if (data.type !== undefined) {
      await prisma.$executeRaw`UPDATE "FieldDefinition"
        SET "type" = ${data.type}, "updatedAt" = datetime('now') WHERE "id" = ${id}`;
    }
    if (data.required !== undefined) {
      await prisma.$executeRaw`UPDATE "FieldDefinition"
        SET "required" = ${data.required ? 1 : 0}, "updatedAt" = datetime('now')
        WHERE "id" = ${id}`;
    }
  } catch {
    return { ok: false as const, error: "Could not update the field" };
  }
  revalidatePath("/crm");
  return { ok: true as const };
}

/** "Delete" archives the definition — existing deal values are preserved. */
export async function deleteFieldDefAction(id: string) {
  try {
    await ensureCustomizationSchema();
    await prisma.$executeRaw`UPDATE "FieldDefinition"
      SET "archived" = 1, "updatedAt" = datetime('now') WHERE "id" = ${id}`;
  } catch {
    return { ok: false as const, error: "Could not remove the field" };
  }
  revalidatePath("/crm");
  return { ok: true as const };
}

// --- Pipeline stages -------------------------------------------------------

export async function createStageAction(input: {
  name: string;
  nameKa?: string;
  type?: string;
}) {
  const name = input.name.trim();
  if (!name) return { ok: false as const, error: "A stage name is required" };
  const pipeline =
    (await prisma.pipeline.findFirst({ where: { isDefault: true } })) ??
    (await prisma.pipeline.findFirst());
  if (!pipeline) return { ok: false as const, error: "No pipeline found" };
  const last = await prisma.stage.findFirst({
    where: { pipelineId: pipeline.id },
    orderBy: { position: "desc" },
  });
  await prisma.stage.create({
    data: {
      pipelineId: pipeline.id,
      name,
      nameKa: input.nameKa?.trim() || null,
      type: input.type === "won" || input.type === "lost" ? input.type : "open",
      position: (last?.position ?? -1) + 1,
    },
  });
  revalidatePath("/crm");
  return { ok: true as const };
}

export async function updateStageAction(
  id: string,
  data: { name?: string; nameKa?: string; type?: string },
) {
  await prisma.stage.update({
    where: { id },
    data: {
      name: data.name?.trim() || undefined,
      nameKa:
        data.nameKa !== undefined ? data.nameKa.trim() || null : undefined,
      type: data.type,
    },
  });
  revalidatePath("/crm");
  return { ok: true as const };
}

export async function reorderStagesAction(orderedIds: string[]) {
  // Two passes: stage positions are unique per pipeline, so park them high first.
  await prisma.$transaction(
    orderedIds.map((id, i) =>
      prisma.stage.update({ where: { id }, data: { position: 1000 + i } }),
    ),
  );
  await prisma.$transaction(
    orderedIds.map((id, i) =>
      prisma.stage.update({ where: { id }, data: { position: i } }),
    ),
  );
  revalidatePath("/crm");
  return { ok: true as const };
}

export async function deleteStageAction(id: string) {
  const count = await prisma.deal.count({ where: { stageId: id } });
  if (count > 0) {
    return {
      ok: false as const,
      error: `This stage still has ${count} deal(s) — move them first`,
    };
  }
  await prisma.stage.delete({ where: { id } });
  revalidatePath("/crm");
  return { ok: true as const };
}

// --- Policy details & renewal schedule -------------------------------------

export async function updatePolicyAction(
  dealId: string,
  data: {
    insurer?: string;
    policyNumber?: string;
    policyStart?: string;
    renewalDate?: string;
  },
) {
  const text = (v: string | undefined) =>
    v !== undefined && v.trim() ? v.trim() : null;
  try {
    await ensureCustomizationSchema();
    await prisma.$executeRaw`
      UPDATE "InsuranceProfile" SET
        "insurer" = ${text(data.insurer)},
        "policyNumber" = ${text(data.policyNumber)},
        "policyStart" = ${text(data.policyStart)},
        "policyExpiry" = ${text(data.renewalDate)}
      WHERE "dealId" = ${dealId}`;
  } catch {
    return { ok: false as const, error: "Could not save the policy details" };
  }
  revalidatePath("/crm");
  return { ok: true as const };
}

export async function saveRenewalScheduleAction(schedule: RenewalSchedule) {
  const saved = await saveRenewalSchedule(schedule);
  revalidatePath("/crm");
  return saved
    ? { ok: true as const }
    : { ok: false as const, error: "Could not save the schedule" };
}

// --- Contact hub & lead assignment -----------------------------------------

/** Open a new insurance (deal) for an existing contact. */
export async function addInsuranceAction(
  personId: string,
  lineOfBusiness: string,
  request?: string,
) {
  const lob = (LOBS as readonly string[]).includes(lineOfBusiness)
    ? lineOfBusiness
    : "auto";
  try {
    const result = await createInsuranceForPerson(personId, lob, request);
    if (!result) return { ok: false as const, error: "Contact not found" };
    revalidatePath("/crm");
    return { ok: true as const, dealId: result.dealId };
  } catch (err) {
    return { ok: false as const, error: (err as Error).message };
  }
}

/** Round-robin every unassigned open lead across the active agents. */
export async function autoSplitAction() {
  const unassigned = await prisma.deal.findMany({
    where: { status: "open", ownerId: null },
    orderBy: { createdAt: "asc" },
  });
  const agents = await prisma.user.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  if (!agents.length || !unassigned.length) {
    revalidatePath("/crm");
    return { ok: true as const, assigned: 0 };
  }
  // Start from the least-loaded agent so the split stays balanced.
  const load = await Promise.all(
    agents.map(async (a) => ({
      id: a.id,
      n: await prisma.deal.count({
        where: { ownerId: a.id, status: "open" },
      }),
    })),
  );
  load.sort((a, b) => a.n - b.n);
  for (let i = 0; i < unassigned.length; i++) {
    await prisma.deal.update({
      where: { id: unassigned[i].id },
      data: { ownerId: load[i % load.length].id },
    });
  }
  revalidatePath("/crm");
  return { ok: true as const, assigned: unassigned.length };
}

// --- Quote flows ------------------------------------------------------------
//
// All quote-flow editing happens through these actions. The data layer lives
// in lib/quote/flows.ts; this just exposes it as Server Actions and revalidates
// the paths that read from it.

function revalidateFlows() {
  revalidatePath("/crm/settings");
  // The public form pulls from the same source.
  revalidatePath("/quote", "layout");
}

export async function createFlowAction(input: {
  lob: string;
  name: string;
  defaultLang?: Lang;
}) {
  try {
    const flow = await createFlow(input);
    revalidateFlows();
    return { ok: true as const, flow };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Failed to create flow",
    };
  }
}

export async function updateFlowAction(id: string, patch: UpdateFlowPatch) {
  await updateFlow(id, patch);
  revalidateFlows();
  return { ok: true as const };
}

export async function deleteFlowAction(id: string) {
  await deleteFlow(id);
  revalidateFlows();
  return { ok: true as const };
}

export async function createStepAction(input: CreateStepInput) {
  const step = await createStep(input);
  revalidateFlows();
  return { ok: true as const, step };
}

export async function updateStepAction(id: string, patch: UpdateStepPatch) {
  await updateStep(id, patch);
  revalidateFlows();
  return { ok: true as const };
}

export async function deleteStepAction(id: string) {
  await deleteStep(id);
  revalidateFlows();
  return { ok: true as const };
}

export async function reorderStepsAction(flowId: string, ids: string[]) {
  await reorderSteps(flowId, ids);
  revalidateFlows();
  return { ok: true as const };
}

/**
 * Public form submission — runs without authentication. Translates the
 * collected answers into the same shape ingestLead expects, then opens a
 * deal and assigns an owner via the existing round-robin logic.
 */
export async function submitQuoteAction(payload: {
  lob: string;
  flowId: string;
  answers: Record<string, unknown>;
  contact: { name: string; phone: string; email?: string; city?: string };
  lang?: Lang;
}) {
  const { lob, answers, contact } = payload;
  if (!contact.name?.trim() || !contact.phone?.trim()) {
    return { ok: false as const, error: "Name and phone are required" };
  }

  // Summarize the answers into a one-line request so the agent has context.
  const summary = Object.entries(answers)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
    .join(" · ");

  // ingestLead's TS type narrows to the known LOB enum; the flow builder also
  // restricts the LOB picker to that same list, so the cast is safe.
  const result = await ingestLead({
    source: "Public quote form",
    lineOfBusiness: lob as Lob,
    request: summary || `${lob} quote request`,
    person: {
      name: contact.name.trim(),
      phone: contact.phone.trim(),
      email: contact.email?.trim() || undefined,
      city: contact.city?.trim() || undefined,
      source: "quote-form",
      consent: { marketing: true, channels: ["email"] },
    },
    profile: answers as Record<string, unknown>,
  });

  return {
    ok: true as const,
    reference: result.reference,
    dealId: result.dealId,
  };
}

// Re-export the StepType so client components can import a single source.
export type { StepType };

