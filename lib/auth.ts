/**
 * User authentication for the CRM.
 *
 * Email + password sign-in with scrypt-hashed passwords and a signed,
 * HMAC-protected session cookie (no session table needed).
 *
 * The `User.passwordHash` column is added on first use with plain SQL, and
 * any seeded agent without a password gets a default one — so this works
 * with the existing database, no migration required.
 */
import crypto from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { maybeSweepRenewals } from "@/lib/crm/renewal-sweep";

const scryptAsync = promisify(crypto.scrypt);

const COOKIE = "gurdena_session";
const SESSION_DAYS = 14;

/** Demo password given to seeded agents that have none yet. */
export const DEFAULT_PASSWORD = "gurdena123";

/** Roles allowed into Settings / manager tools. */
export const MANAGER_ROLES = ["manager", "admin", "senior_agent"];

export interface SessionUser {
  id: string;
  name: string;
  email: string | null;
  role: string;
}

function hmacSecret(): string {
  return env.encryptionKey ?? "gurdena-dev-session-secret";
}

// --- Password hashing -------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 32)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = (await scryptAsync(password, salt, 32)) as Buffer;
  const expected = Buffer.from(hash, "hex");
  return (
    expected.length === derived.length &&
    crypto.timingSafeEqual(expected, derived)
  );
}

// --- Self-applying schema ---------------------------------------------------

let authReady: Promise<void> | null = null;

async function applyAuthSchema(): Promise<void> {
  const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `PRAGMA table_info("User")`,
  );
  if (!columns.some((c) => c.name === "passwordHash")) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT`,
    );
  }
  // Give every passwordless user the demo password.
  const users = await prisma.$queryRawUnsafe<
    Array<{ id: string; passwordHash: string | null }>
  >(`SELECT "id", "passwordHash" FROM "User"`);
  for (const user of users) {
    if (!user.passwordHash) {
      const hash = await hashPassword(DEFAULT_PASSWORD);
      await prisma.$executeRaw`
        UPDATE "User" SET "passwordHash" = ${hash} WHERE "id" = ${user.id}`;
    }
  }
}

export function ensureAuthReady(): Promise<void> {
  if (!authReady) {
    authReady = applyAuthSchema().catch((err) => {
      authReady = null;
      throw err;
    });
  }
  return authReady;
}

// --- Session cookie ---------------------------------------------------------

function sign(value: string): string {
  return crypto.createHmac("sha256", hmacSecret()).update(value).digest("hex");
}

function makeToken(userId: string): string {
  const body = `${userId}.${Date.now() + SESSION_DAYS * 86_400_000}`;
  return `${body}.${sign(body)}`;
}

function readToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiry, signature] = parts;
  if (sign(`${userId}.${expiry}`) !== signature) return null;
  if (Number(expiry) < Date.now()) return null;
  return userId;
}

// --- Public API -------------------------------------------------------------

export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const userId = readToken(token);
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.active) return null;
  // Throttled, fire-and-forget — keeps renewal notifications fresh without a cron.
  maybeSweepRenewals();
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  await ensureAuthReady();
  const rows = await prisma.$queryRaw<
    Array<{ id: string; passwordHash: string | null }>
  >`SELECT "id", "passwordHash" FROM "User"
    WHERE lower("email") = ${email.trim().toLowerCase()}`;
  const row = rows[0];
  if (!row || !row.passwordHash) {
    return { ok: false, error: "Invalid email or password" };
  }
  if (!(await verifyPassword(password, row.passwordHash))) {
    return { ok: false, error: "Invalid email or password" };
  }
  const jar = await cookies();
  jar.set(COOKIE, makeToken(row.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export function canManage(role: string | undefined | null): boolean {
  return role ? MANAGER_ROLES.includes(role) : false;
}
