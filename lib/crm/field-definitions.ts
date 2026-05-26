/**
 * Custom field definitions.
 *
 * The manager edits these in Settings. A definition with `lob === ""` is
 * shared across every deal; otherwise it applies only to that line of
 * business.
 *
 * Storage uses plain SQL against a self-created `FieldDefinition` table (see
 * ensure-schema.ts), so it works with the existing Prisma client — no
 * migration or client regeneration required.
 */
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { LOB_TEMPLATES } from "./fields";
import { ensureCustomizationSchema } from "./ensure-schema";

export interface FieldDefinitionRow {
  id: string;
  key: string;
  labelEn: string;
  labelKa: string | null;
  type: string;
  options: unknown;
  required: boolean;
  lob: string;
  position: number;
}

export interface ResolvedField {
  key: string;
  labelEn: string;
  labelKa: string | null;
  type: string;
  options: string[] | null;
  required: boolean;
  /** True when this is a shared field (applies to all insurance types). */
  shared: boolean;
  value: string;
  source: string;
}

interface RawDef {
  id: string;
  key: string;
  labelEn: string;
  labelKa: string | null;
  type: string;
  options: string | null;
  required: number | bigint;
  lob: string;
  position: number | bigint;
}

function normalize(r: RawDef): FieldDefinitionRow {
  let options: unknown = null;
  if (r.options) {
    try {
      options = JSON.parse(r.options);
    } catch {
      options = null;
    }
  }
  return {
    id: r.id,
    key: r.key,
    labelEn: r.labelEn,
    labelKa: r.labelKa,
    type: r.type,
    options,
    required: Number(r.required) === 1,
    lob: r.lob,
    position: Number(r.position),
  };
}

interface DefaultDef {
  key: string;
  labelEn: string;
  labelKa: string;
  type: string;
  required: boolean;
  lob: string;
  position: number;
}

function defaultDefs(): DefaultDef[] {
  const rows: DefaultDef[] = [];
  for (const [lob, template] of Object.entries(LOB_TEMPLATES)) {
    template.forEach((tmpl, index) => {
      rows.push({
        key: tmpl.key,
        labelEn: tmpl.labelEn,
        labelKa: tmpl.labelKa,
        type: tmpl.type,
        required: tmpl.required,
        lob,
        position: index,
      });
    });
  }
  rows.push({
    key: "preferredContactTime",
    labelEn: "Preferred contact time",
    labelKa: "კონტაქტის სასურველი დრო",
    type: "text",
    required: false,
    lob: "",
    position: 0,
  });
  return rows;
}

/** Seed default definitions once, if the table is empty. */
export async function ensureDefaultFieldDefinitions(): Promise<void> {
  await ensureCustomizationSchema();
  const countRows = await prisma.$queryRawUnsafe<Array<{ n: number | bigint }>>(
    `SELECT COUNT(*) AS n FROM "FieldDefinition"`,
  );
  if (Number(countRows[0]?.n ?? 0) > 0) return;
  for (const d of defaultDefs()) {
    await prisma.$executeRaw`
      INSERT INTO "FieldDefinition"
        ("id", "key", "labelEn", "labelKa", "type", "required", "lob", "position")
      VALUES (${randomUUID()}, ${d.key}, ${d.labelEn}, ${d.labelKa},
              ${d.type}, ${d.required ? 1 : 0}, ${d.lob}, ${d.position})`;
  }
}

/** Every non-archived definition, ordered. */
export async function getAllDefinitions(): Promise<FieldDefinitionRow[]> {
  try {
    await ensureDefaultFieldDefinitions();
    const rows = await prisma.$queryRawUnsafe<RawDef[]>(
      `SELECT "id", "key", "labelEn", "labelKa", "type", "options",
              "required", "lob", "position"
       FROM "FieldDefinition" WHERE "archived" = 0
       ORDER BY "lob" ASC, "position" ASC`,
    );
    return rows.map(normalize);
  } catch {
    // Last-resort fallback — never break the board.
    return defaultDefs().map((d) => ({
      id: `tmpl_${d.lob}_${d.key}`,
      key: d.key,
      labelEn: d.labelEn,
      labelKa: d.labelKa,
      type: d.type,
      options: null,
      required: d.required,
      lob: d.lob,
      position: d.position,
    }));
  }
}

/** Definitions that apply to a deal of `lob` — shared plus type-specific. */
export async function getDefinitionsForLob(
  lob: string,
): Promise<FieldDefinitionRow[]> {
  const all = await getAllDefinitions();
  return all.filter((d) => d.lob === "" || d.lob === lob);
}

/** Join definitions with a deal's stored values into renderable fields. */
export function mergeFields(
  definitions: FieldDefinitionRow[],
  stored: unknown,
): ResolvedField[] {
  const byKey = new Map<string, { value: string; source: string }>();
  if (Array.isArray(stored)) {
    for (const entry of stored as Array<Record<string, unknown>>) {
      if (entry && typeof entry.key === "string") {
        byKey.set(entry.key, {
          value: typeof entry.value === "string" ? entry.value : "",
          source: typeof entry.source === "string" ? entry.source : "agent",
        });
      }
    }
  }
  return definitions.map((def) => {
    const current = byKey.get(def.key);
    const value = current?.value ?? "";
    return {
      key: def.key,
      labelEn: def.labelEn,
      labelKa: def.labelKa,
      type: def.type,
      options: Array.isArray(def.options) ? (def.options as string[]) : null,
      required: def.required,
      shared: def.lob === "",
      value,
      source: value ? current?.source || "agent" : "missing",
    };
  });
}

/** Count of empty required fields — the deal's quote-readiness gap. */
export function countMissingRequired(resolved: ResolvedField[]): number {
  return resolved.filter((f) => f.required && !f.value.trim()).length;
}

/** Required field keys for a line of business — used by the stage gate. */
export async function getRequiredKeysForLob(lob: string): Promise<string[]> {
  const defs = await getDefinitionsForLob(lob);
  return defs.filter((d) => d.required).map((d) => d.key);
}
