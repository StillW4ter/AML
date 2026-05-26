/**
 * Self-applying schema for the customization features.
 *
 * The customization tables (FieldDefinition, Setting) and the InsuranceProfile
 * policy columns are created on first use with plain SQL, so the features work
 * without a Prisma migration or client regeneration. Idempotent and cached for
 * the process lifetime.
 */
import { prisma } from "@/lib/db";

let ensured: Promise<void> | null = null;

async function apply(): Promise<void> {
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "FieldDefinition" (
       "id" TEXT PRIMARY KEY NOT NULL,
       "key" TEXT NOT NULL,
       "labelEn" TEXT NOT NULL,
       "labelKa" TEXT,
       "type" TEXT NOT NULL DEFAULT 'text',
       "options" TEXT,
       "required" INTEGER NOT NULL DEFAULT 0,
       "lob" TEXT NOT NULL DEFAULT '',
       "position" INTEGER NOT NULL DEFAULT 0,
       "archived" INTEGER NOT NULL DEFAULT 0,
       "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
       "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
     )`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "FieldDefinition_lob_key"
       ON "FieldDefinition" ("lob", "key")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "Setting" (
       "key" TEXT PRIMARY KEY NOT NULL,
       "value" TEXT NOT NULL,
       "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
     )`,
  );

  // InsuranceProfile policy columns — SQLite lacks ADD COLUMN IF NOT EXISTS.
  const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `PRAGMA table_info("InsuranceProfile")`,
  );
  const present = new Set(columns.map((c) => c.name));
  if (!present.has("insurer")) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "InsuranceProfile" ADD COLUMN "insurer" TEXT`,
    );
  }
  if (!present.has("policyNumber")) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "InsuranceProfile" ADD COLUMN "policyNumber" TEXT`,
    );
  }
  if (!present.has("policyStart")) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "InsuranceProfile" ADD COLUMN "policyStart" TEXT`,
    );
  }
  // Own column for the policy expiry — kept separate from Prisma's managed
  // `renewalDate` so the existing client never reads an unexpected value.
  if (!present.has("policyExpiry")) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "InsuranceProfile" ADD COLUMN "policyExpiry" TEXT`,
    );
  }
  // Tracks the renewal Deal automatically opened for the current expiry, so
  // the sweep stays idempotent (one renewal per policy expiry).
  if (!present.has("renewalDealId")) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "InsuranceProfile" ADD COLUMN "renewalDealId" TEXT`,
    );
  }
}

export function ensureCustomizationSchema(): Promise<void> {
  if (!ensured) {
    ensured = apply().catch((err) => {
      ensured = null; // allow a retry on the next call
      throw err;
    });
  }
  return ensured;
}
