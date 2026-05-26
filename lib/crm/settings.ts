/**
 * Global CRM settings — currently the renewal-notification schedule.
 *
 * Stored as plain SQL in a self-created `Setting` table (see ensure-schema.ts),
 * so it works with the existing Prisma client — no migration required.
 */
import { prisma } from "@/lib/db";
import { ensureCustomizationSchema } from "./ensure-schema";

export interface RenewalSchedule {
  /** Days before expiry on which to notify the assigned agent. */
  offsets: number[];
  /** Also notify every day for the final N days before expiry. */
  dailyForLastDays: number;
}

const RENEWAL_KEY = "renewalSchedule";

export const DEFAULT_RENEWAL_SCHEDULE: RenewalSchedule = {
  offsets: [30, 14],
  dailyForLastDays: 7,
};

export async function getRenewalSchedule(): Promise<RenewalSchedule> {
  try {
    await ensureCustomizationSchema();
    const rows = await prisma.$queryRaw<Array<{ value: string }>>`
      SELECT "value" FROM "Setting" WHERE "key" = ${RENEWAL_KEY}`;
    if (!rows.length) return DEFAULT_RENEWAL_SCHEDULE;
    const v = JSON.parse(rows[0].value) as Partial<RenewalSchedule>;
    return {
      offsets:
        Array.isArray(v.offsets) && v.offsets.length
          ? v.offsets
          : DEFAULT_RENEWAL_SCHEDULE.offsets,
      dailyForLastDays:
        typeof v.dailyForLastDays === "number"
          ? v.dailyForLastDays
          : DEFAULT_RENEWAL_SCHEDULE.dailyForLastDays,
    };
  } catch {
    return DEFAULT_RENEWAL_SCHEDULE;
  }
}

/** Returns true once persisted. */
export async function saveRenewalSchedule(
  schedule: RenewalSchedule,
): Promise<boolean> {
  try {
    await ensureCustomizationSchema();
    const clean: RenewalSchedule = {
      offsets: [
        ...new Set(schedule.offsets.filter((n) => Number.isFinite(n) && n > 0)),
      ].sort((a, b) => b - a),
      dailyForLastDays: Math.max(
        0,
        Math.min(60, Math.round(schedule.dailyForLastDays)),
      ),
    };
    const json = JSON.stringify(clean);
    await prisma.$executeRaw`
      INSERT INTO "Setting" ("key", "value", "updatedAt")
      VALUES (${RENEWAL_KEY}, ${json}, datetime('now'))
      ON CONFLICT("key") DO UPDATE SET
        "value" = ${json}, "updatedAt" = datetime('now')`;
    return true;
  } catch {
    return false;
  }
}
