/**
 * Quote-flow data layer — schema, CRUD, and default seeds.
 *
 * The flow editor (Settings → Quote flows) and the public /quote/[lob] page
 * both go through this module. Tables are created via raw SQL on first use,
 * so no Prisma migration is needed — same pattern as ensure-schema.ts.
 *
 * Multilingual content is stored as parallel columns (titleEn/Ka/Ru) plus a
 * JSON blob for choice options. We keep the JSON minimal and well-typed so
 * the form renderer can trust it without further validation.
 */
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import type { Lang } from "@/lib/i18n";

// --- Shared types -----------------------------------------------------------

export type StepType =
  | "choice"
  | "multi"
  | "text"
  | "longText"
  | "number"
  | "date"
  | "phone"
  | "email";

export interface StepOption {
  value: string;
  labelEn: string;
  labelKa?: string | null;
  labelRu?: string | null;
  icon?: string | null;
}

export interface QuoteStepDTO {
  id: string;
  flowId: string;
  position: number;
  fieldKey: string;
  type: StepType;
  icon: string | null;
  required: boolean;
  titleEn: string;
  titleKa: string | null;
  titleRu: string | null;
  helpEn: string | null;
  helpKa: string | null;
  helpRu: string | null;
  options: StepOption[];
  showIfStepKey: string | null;
  showIfValue: string | null;
}

export interface QuoteFlowDTO {
  id: string;
  lob: string;
  name: string;
  defaultLang: Lang;
  active: boolean;
  steps: QuoteStepDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface QuoteFlowSummary {
  id: string;
  lob: string;
  name: string;
  defaultLang: Lang;
  active: boolean;
  stepCount: number;
  updatedAt: string;
}

// --- Schema (self-creating) -------------------------------------------------

let ensured: Promise<void> | null = null;

async function apply(): Promise<void> {
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "QuoteFlow" (
       "id" TEXT PRIMARY KEY NOT NULL,
       "lob" TEXT NOT NULL,
       "name" TEXT NOT NULL,
       "defaultLang" TEXT NOT NULL DEFAULT 'en',
       "active" INTEGER NOT NULL DEFAULT 1,
       "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
       "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
     )`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "QuoteFlow_lob"
       ON "QuoteFlow" ("lob")`,
  );

  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "QuoteStep" (
       "id" TEXT PRIMARY KEY NOT NULL,
       "flowId" TEXT NOT NULL,
       "position" INTEGER NOT NULL DEFAULT 0,
       "fieldKey" TEXT NOT NULL,
       "type" TEXT NOT NULL DEFAULT 'choice',
       "icon" TEXT,
       "required" INTEGER NOT NULL DEFAULT 0,
       "titleEn" TEXT NOT NULL DEFAULT '',
       "titleKa" TEXT,
       "titleRu" TEXT,
       "helpEn" TEXT,
       "helpKa" TEXT,
       "helpRu" TEXT,
       "optionsJson" TEXT NOT NULL DEFAULT '[]',
       "showIfStepKey" TEXT,
       "showIfValue" TEXT,
       "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
       "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
     )`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "QuoteStep_flow_pos"
       ON "QuoteStep" ("flowId", "position")`,
  );
}

export function ensureQuoteSchema(): Promise<void> {
  if (!ensured) {
    ensured = apply().catch((err) => {
      ensured = null;
      throw err;
    });
  }
  return ensured;
}

// --- Helpers ----------------------------------------------------------------

function parseOptions(raw: string | null | undefined): StepOption[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((o): o is StepOption => !!o && typeof o.value === "string")
      .map((o) => ({
        value: o.value,
        labelEn: o.labelEn ?? o.value,
        labelKa: o.labelKa ?? null,
        labelRu: o.labelRu ?? null,
        icon: o.icon ?? null,
      }));
  } catch {
    return [];
  }
}

function rowToStep(row: {
  id: string;
  flowId: string;
  position: number;
  fieldKey: string;
  type: string;
  icon: string | null;
  required: number;
  titleEn: string;
  titleKa: string | null;
  titleRu: string | null;
  helpEn: string | null;
  helpKa: string | null;
  helpRu: string | null;
  optionsJson: string | null;
  showIfStepKey: string | null;
  showIfValue: string | null;
}): QuoteStepDTO {
  return {
    id: row.id,
    flowId: row.flowId,
    position: row.position,
    fieldKey: row.fieldKey,
    type: (row.type as StepType) ?? "text",
    icon: row.icon,
    required: row.required === 1,
    titleEn: row.titleEn,
    titleKa: row.titleKa,
    titleRu: row.titleRu,
    helpEn: row.helpEn,
    helpKa: row.helpKa,
    helpRu: row.helpRu,
    options: parseOptions(row.optionsJson),
    showIfStepKey: row.showIfStepKey,
    showIfValue: row.showIfValue,
  };
}

function asLang(value: unknown): Lang {
  return value === "ka" || value === "ru" ? value : "en";
}

// --- Reads ------------------------------------------------------------------

export async function listFlows(): Promise<QuoteFlowSummary[]> {
  await ensureQuoteSchema();
  await seedDefaultFlowsIfEmpty();
  const flows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      lob: string;
      name: string;
      defaultLang: string;
      active: number;
      updatedAt: string;
      stepCount: number;
    }>
  >(
    `SELECT f."id", f."lob", f."name", f."defaultLang", f."active",
            f."updatedAt",
            (SELECT COUNT(*) FROM "QuoteStep" s WHERE s."flowId" = f."id")
              AS "stepCount"
       FROM "QuoteFlow" f
      ORDER BY f."lob" ASC`,
  );
  return flows.map((f) => ({
    id: f.id,
    lob: f.lob,
    name: f.name,
    defaultLang: asLang(f.defaultLang),
    active: f.active === 1,
    stepCount: Number(f.stepCount ?? 0),
    updatedAt: f.updatedAt,
  }));
}

export async function getFlowById(id: string): Promise<QuoteFlowDTO | null> {
  await ensureQuoteSchema();
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      lob: string;
      name: string;
      defaultLang: string;
      active: number;
      createdAt: string;
      updatedAt: string;
    }>
  >`SELECT * FROM "QuoteFlow" WHERE "id" = ${id}`;
  const flow = rows[0];
  if (!flow) return null;
  const steps = await getStepsForFlow(flow.id);
  return {
    id: flow.id,
    lob: flow.lob,
    name: flow.name,
    defaultLang: asLang(flow.defaultLang),
    active: flow.active === 1,
    createdAt: flow.createdAt,
    updatedAt: flow.updatedAt,
    steps,
  };
}

export async function getActiveFlowForLob(
  lob: string,
): Promise<QuoteFlowDTO | null> {
  await ensureQuoteSchema();
  await seedDefaultFlowsIfEmpty();
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      lob: string;
      name: string;
      defaultLang: string;
      active: number;
      createdAt: string;
      updatedAt: string;
    }>
  >`SELECT * FROM "QuoteFlow"
     WHERE "lob" = ${lob} AND "active" = 1
     LIMIT 1`;
  const flow = rows[0];
  if (!flow) return null;
  const steps = await getStepsForFlow(flow.id);
  return {
    id: flow.id,
    lob: flow.lob,
    name: flow.name,
    defaultLang: asLang(flow.defaultLang),
    active: true,
    createdAt: flow.createdAt,
    updatedAt: flow.updatedAt,
    steps,
  };
}

async function getStepsForFlow(flowId: string): Promise<QuoteStepDTO[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      flowId: string;
      position: number;
      fieldKey: string;
      type: string;
      icon: string | null;
      required: number;
      titleEn: string;
      titleKa: string | null;
      titleRu: string | null;
      helpEn: string | null;
      helpKa: string | null;
      helpRu: string | null;
      optionsJson: string | null;
      showIfStepKey: string | null;
      showIfValue: string | null;
    }>
  >`SELECT * FROM "QuoteStep"
     WHERE "flowId" = ${flowId}
     ORDER BY "position" ASC, "createdAt" ASC`;
  return rows.map(rowToStep);
}

// --- Writes -----------------------------------------------------------------

export interface CreateFlowInput {
  lob: string;
  name: string;
  defaultLang?: Lang;
}

export async function createFlow(
  input: CreateFlowInput,
): Promise<QuoteFlowSummary> {
  await ensureQuoteSchema();
  const existing = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "QuoteFlow" WHERE "lob" = ${input.lob} LIMIT 1`;
  if (existing.length) {
    throw new Error("A flow already exists for that insurance type");
  }
  const id = randomUUID();
  const lang = input.defaultLang ?? "en";
  await prisma.$executeRaw`
    INSERT INTO "QuoteFlow" ("id", "lob", "name", "defaultLang", "active")
    VALUES (${id}, ${input.lob}, ${input.name}, ${lang}, 1)`;
  return {
    id,
    lob: input.lob,
    name: input.name,
    defaultLang: lang,
    active: true,
    stepCount: 0,
    updatedAt: new Date().toISOString(),
  };
}

export interface UpdateFlowPatch {
  name?: string;
  defaultLang?: Lang;
  active?: boolean;
}

export async function updateFlow(
  id: string,
  patch: UpdateFlowPatch,
): Promise<void> {
  await ensureQuoteSchema();
  // Build the SET clause dynamically — straightforward with three optional cols.
  const sets: string[] = [];
  const params: unknown[] = [];
  if (patch.name !== undefined) {
    sets.push(`"name" = ?`);
    params.push(patch.name);
  }
  if (patch.defaultLang !== undefined) {
    sets.push(`"defaultLang" = ?`);
    params.push(patch.defaultLang);
  }
  if (patch.active !== undefined) {
    sets.push(`"active" = ?`);
    params.push(patch.active ? 1 : 0);
  }
  if (!sets.length) return;
  sets.push(`"updatedAt" = datetime('now')`);
  params.push(id);
  await prisma.$executeRawUnsafe(
    `UPDATE "QuoteFlow" SET ${sets.join(", ")} WHERE "id" = ?`,
    ...params,
  );
}

export async function deleteFlow(id: string): Promise<void> {
  await ensureQuoteSchema();
  await prisma.$executeRaw`DELETE FROM "QuoteStep" WHERE "flowId" = ${id}`;
  await prisma.$executeRaw`DELETE FROM "QuoteFlow" WHERE "id" = ${id}`;
}

export interface CreateStepInput {
  flowId: string;
  fieldKey?: string;
  type?: StepType;
  icon?: string | null;
  required?: boolean;
  titleEn?: string;
  titleKa?: string | null;
  titleRu?: string | null;
  options?: StepOption[];
}

export async function createStep(
  input: CreateStepInput,
): Promise<QuoteStepDTO> {
  await ensureQuoteSchema();
  const id = randomUUID();
  // Append to the end of the list.
  const tail = await prisma.$queryRaw<Array<{ pos: number | null }>>`
    SELECT MAX("position") AS "pos" FROM "QuoteStep" WHERE "flowId" = ${input.flowId}`;
  const position = (tail[0]?.pos ?? -1) + 1;
  const fieldKey = input.fieldKey?.trim() || `field_${position + 1}`;
  const type = input.type ?? "choice";
  const optionsJson = JSON.stringify(input.options ?? []);
  await prisma.$executeRaw`
    INSERT INTO "QuoteStep" (
      "id", "flowId", "position", "fieldKey", "type", "icon",
      "required", "titleEn", "titleKa", "titleRu", "optionsJson"
    )
    VALUES (
      ${id}, ${input.flowId}, ${position}, ${fieldKey}, ${type},
      ${input.icon ?? null}, ${input.required ? 1 : 0},
      ${input.titleEn ?? "New question"}, ${input.titleKa ?? null},
      ${input.titleRu ?? null}, ${optionsJson}
    )`;
  const created = await prisma.$queryRaw<
    Array<{
      id: string;
      flowId: string;
      position: number;
      fieldKey: string;
      type: string;
      icon: string | null;
      required: number;
      titleEn: string;
      titleKa: string | null;
      titleRu: string | null;
      helpEn: string | null;
      helpKa: string | null;
      helpRu: string | null;
      optionsJson: string | null;
      showIfStepKey: string | null;
      showIfValue: string | null;
    }>
  >`SELECT * FROM "QuoteStep" WHERE "id" = ${id}`;
  return rowToStep(created[0]);
}

export interface UpdateStepPatch {
  fieldKey?: string;
  type?: StepType;
  icon?: string | null;
  required?: boolean;
  titleEn?: string;
  titleKa?: string | null;
  titleRu?: string | null;
  helpEn?: string | null;
  helpKa?: string | null;
  helpRu?: string | null;
  options?: StepOption[];
  showIfStepKey?: string | null;
  showIfValue?: string | null;
}

export async function updateStep(
  id: string,
  patch: UpdateStepPatch,
): Promise<void> {
  await ensureQuoteSchema();
  const sets: string[] = [];
  const params: unknown[] = [];
  const set = (col: string, val: unknown) => {
    sets.push(`"${col}" = ?`);
    params.push(val);
  };
  if (patch.fieldKey !== undefined) set("fieldKey", patch.fieldKey.trim());
  if (patch.type !== undefined) set("type", patch.type);
  if (patch.icon !== undefined) set("icon", patch.icon);
  if (patch.required !== undefined) set("required", patch.required ? 1 : 0);
  if (patch.titleEn !== undefined) set("titleEn", patch.titleEn);
  if (patch.titleKa !== undefined) set("titleKa", patch.titleKa);
  if (patch.titleRu !== undefined) set("titleRu", patch.titleRu);
  if (patch.helpEn !== undefined) set("helpEn", patch.helpEn);
  if (patch.helpKa !== undefined) set("helpKa", patch.helpKa);
  if (patch.helpRu !== undefined) set("helpRu", patch.helpRu);
  if (patch.options !== undefined)
    set("optionsJson", JSON.stringify(patch.options));
  if (patch.showIfStepKey !== undefined)
    set("showIfStepKey", patch.showIfStepKey);
  if (patch.showIfValue !== undefined) set("showIfValue", patch.showIfValue);
  if (!sets.length) return;
  sets.push(`"updatedAt" = datetime('now')`);
  params.push(id);
  await prisma.$executeRawUnsafe(
    `UPDATE "QuoteStep" SET ${sets.join(", ")} WHERE "id" = ?`,
    ...params,
  );
  // Touch the parent flow's updatedAt — useful for the manager list view.
  await prisma.$executeRaw`
    UPDATE "QuoteFlow" SET "updatedAt" = datetime('now')
    WHERE "id" = (SELECT "flowId" FROM "QuoteStep" WHERE "id" = ${id})`;
}

export async function deleteStep(id: string): Promise<void> {
  await ensureQuoteSchema();
  await prisma.$executeRaw`DELETE FROM "QuoteStep" WHERE "id" = ${id}`;
}

export async function reorderSteps(
  flowId: string,
  orderedIds: string[],
): Promise<void> {
  await ensureQuoteSchema();
  // SQLite has no real array — just walk the list and set position per id.
  for (let i = 0; i < orderedIds.length; i += 1) {
    const id = orderedIds[i];
    await prisma.$executeRaw`
      UPDATE "QuoteStep" SET "position" = ${i}, "updatedAt" = datetime('now')
      WHERE "id" = ${id} AND "flowId" = ${flowId}`;
  }
}

// --- Seeds ------------------------------------------------------------------

async function seedDefaultFlowsIfEmpty(): Promise<void> {
  const existing = await prisma.$queryRawUnsafe<Array<{ c: number }>>(
    `SELECT COUNT(*) AS "c" FROM "QuoteFlow"`,
  );
  if (Number(existing[0]?.c ?? 0) > 0) return;
  for (const flow of DEFAULT_FLOWS) {
    const flowId = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "QuoteFlow" ("id", "lob", "name", "defaultLang", "active")
      VALUES (${flowId}, ${flow.lob}, ${flow.name}, ${flow.defaultLang}, 1)`;
    for (let i = 0; i < flow.steps.length; i += 1) {
      const s = flow.steps[i];
      const stepId = randomUUID();
      await prisma.$executeRaw`
        INSERT INTO "QuoteStep" (
          "id", "flowId", "position", "fieldKey", "type", "icon",
          "required", "titleEn", "titleKa", "titleRu", "optionsJson"
        )
        VALUES (
          ${stepId}, ${flowId}, ${i}, ${s.fieldKey}, ${s.type},
          ${s.icon ?? null}, ${s.required ? 1 : 0},
          ${s.titleEn}, ${s.titleKa ?? null}, ${s.titleRu ?? null},
          ${JSON.stringify(s.options ?? [])}
        )`;
    }
  }
}

interface DefaultStep {
  fieldKey: string;
  type: StepType;
  icon?: string;
  required?: boolean;
  titleEn: string;
  titleKa?: string;
  titleRu?: string;
  options?: StepOption[];
}

interface DefaultFlow {
  lob: string;
  name: string;
  defaultLang: Lang;
  steps: DefaultStep[];
}

const DEFAULT_FLOWS: DefaultFlow[] = [
  {
    lob: "auto",
    name: "Auto / CASCO quote",
    defaultLang: "en",
    steps: [
      {
        fieldKey: "carBodyType",
        type: "choice",
        icon: "Car",
        required: true,
        titleEn: "What kind of car do you drive?",
        titleKa: "რა მანქანას მართავ?",
        titleRu: "Какой у вас автомобиль?",
        options: [
          { value: "sedan", labelEn: "Sedan", labelKa: "სედანი", labelRu: "Седан", icon: "Car" },
          { value: "suv", labelEn: "SUV", labelKa: "ჯიპი", labelRu: "Внедорожник", icon: "Truck" },
          { value: "hatchback", labelEn: "Hatchback", labelKa: "ჰეჩბექი", labelRu: "Хэтчбек", icon: "Car" },
          { value: "pickup", labelEn: "Pickup", labelKa: "პიკაპი", labelRu: "Пикап", icon: "Truck" },
        ],
      },
      {
        fieldKey: "carYear",
        type: "number",
        icon: "Calendar",
        required: true,
        titleEn: "Year of manufacture",
        titleKa: "გამოშვების წელი",
        titleRu: "Год выпуска",
      },
      {
        fieldKey: "carValue",
        type: "number",
        icon: "DollarSign",
        required: true,
        titleEn: "Estimated value (GEL)",
        titleKa: "სავარაუდო ღირებულება (₾)",
        titleRu: "Оценочная стоимость (₾)",
      },
      {
        fieldKey: "drivers",
        type: "choice",
        icon: "Users",
        required: true,
        titleEn: "How many drivers?",
        titleKa: "რამდენი მძღოლი?",
        titleRu: "Сколько водителей?",
        options: [
          { value: "1", labelEn: "Just me", labelKa: "მხოლოდ მე", labelRu: "Только я" },
          { value: "2", labelEn: "Two", labelKa: "ორი", labelRu: "Двое" },
          { value: "3+", labelEn: "Three or more", labelKa: "სამი ან მეტი", labelRu: "Трое и больше" },
        ],
      },
      {
        fieldKey: "youngDriver",
        type: "choice",
        icon: "User",
        titleEn: "Is anyone under 25?",
        titleKa: "ვინმე 25 წლამდე?",
        titleRu: "Кто-то младше 25 лет?",
        options: [
          { value: "yes", labelEn: "Yes", labelKa: "კი", labelRu: "Да" },
          { value: "no", labelEn: "No", labelKa: "არა", labelRu: "Нет" },
        ],
      },
      {
        fieldKey: "coverage",
        type: "choice",
        icon: "ShieldCheck",
        required: true,
        titleEn: "Coverage level",
        titleKa: "დაფარვის დონე",
        titleRu: "Уровень покрытия",
        options: [
          { value: "tpl", labelEn: "Third-party only", labelKa: "მესამე პირი", labelRu: "Только ОСАГО" },
          { value: "casco", labelEn: "Full CASCO", labelKa: "სრული კასკო", labelRu: "Полное КАСКО" },
        ],
      },
    ],
  },
  {
    lob: "health",
    name: "Health insurance quote",
    defaultLang: "en",
    steps: [
      {
        fieldKey: "people",
        type: "choice",
        icon: "Users",
        required: true,
        titleEn: "Who's the plan for?",
        titleKa: "ვისთვის არის გეგმა?",
        titleRu: "Для кого план?",
        options: [
          { value: "individual", labelEn: "Just me", labelKa: "მხოლოდ მე", labelRu: "Только я", icon: "User" },
          { value: "couple", labelEn: "Me + partner", labelKa: "მე და პარტნიორი", labelRu: "Я и партнёр", icon: "Users" },
          { value: "family", labelEn: "Family", labelKa: "ოჯახი", labelRu: "Семья", icon: "Users" },
        ],
      },
      {
        fieldKey: "age",
        type: "number",
        icon: "Calendar",
        required: true,
        titleEn: "Your age",
        titleKa: "შენი ასაკი",
        titleRu: "Ваш возраст",
      },
      {
        fieldKey: "preExisting",
        type: "choice",
        icon: "HeartPulse",
        titleEn: "Any pre-existing conditions?",
        titleKa: "გაქვს ქრონიკული დაავადება?",
        titleRu: "Хронические заболевания?",
        options: [
          { value: "no", labelEn: "No", labelKa: "არა", labelRu: "Нет" },
          { value: "yes", labelEn: "Yes", labelKa: "კი", labelRu: "Да" },
          { value: "prefer-not", labelEn: "Prefer not to say", labelKa: "არ მსურს პასუხი", labelRu: "Не хочу указывать" },
        ],
      },
      {
        fieldKey: "coverageType",
        type: "choice",
        icon: "Stethoscope",
        required: true,
        titleEn: "What coverage do you need?",
        titleKa: "რა დაფარვა გჭირდება?",
        titleRu: "Какое покрытие нужно?",
        options: [
          { value: "basic", labelEn: "Basic", labelKa: "ბაზური", labelRu: "Базовое" },
          { value: "standard", labelEn: "Standard", labelKa: "სტანდარტული", labelRu: "Стандарт" },
          { value: "premium", labelEn: "Premium", labelKa: "პრემიუმი", labelRu: "Премиум" },
        ],
      },
    ],
  },
];
