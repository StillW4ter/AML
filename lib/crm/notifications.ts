/**
 * In-app notifications for the CRM.
 *
 * Self-creating `Notification` table with a per-user dedupe constraint so the
 * renewal sweep can safely run on every page load without ever creating
 * duplicates for the same policy/window/day.
 */
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";

let ready: Promise<void> | null = null;

async function apply(): Promise<void> {
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "Notification" (
       "id" TEXT PRIMARY KEY NOT NULL,
       "userId" TEXT NOT NULL,
       "type" TEXT NOT NULL,
       "title" TEXT NOT NULL,
       "body" TEXT,
       "link" TEXT,
       "dedupeKey" TEXT,
       "readAt" TEXT,
       "createdAt" TEXT NOT NULL DEFAULT (datetime('now'))
     )`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "Notification_user_dedupe"
       ON "Notification" ("userId", "dedupeKey")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Notification_user_unread"
       ON "Notification" ("userId", "readAt")`,
  );
}

export function ensureNotificationsSchema(): Promise<void> {
  if (!ready) {
    ready = apply().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

export interface NotificationRow {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  dedupeKey: string | null;
  readAt: string | null;
  createdAt: string;
}

/** Insert a notification. Returns false if a row with the same dedupeKey exists. */
export async function createNotification(input: {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  dedupeKey?: string | null;
}): Promise<boolean> {
  try {
    await ensureNotificationsSchema();
    await prisma.$executeRaw`
      INSERT INTO "Notification"
        ("id", "userId", "type", "title", "body", "link", "dedupeKey")
      VALUES (${randomUUID()}, ${input.userId}, ${input.type}, ${input.title},
              ${input.body ?? null}, ${input.link ?? null},
              ${input.dedupeKey ?? null})`;
    return true;
  } catch {
    // unique-key violation → already created for this dedupeKey
    return false;
  }
}

export async function getUserNotifications(
  userId: string,
  limit = 80,
): Promise<NotificationRow[]> {
  try {
    await ensureNotificationsSchema();
    return await prisma.$queryRaw<NotificationRow[]>`
      SELECT "id", "userId", "type", "title", "body", "link",
             "dedupeKey", "readAt", "createdAt"
      FROM "Notification" WHERE "userId" = ${userId}
      ORDER BY ("readAt" IS NULL) DESC, "createdAt" DESC
      LIMIT ${limit}`;
  } catch {
    return [];
  }
}

export async function unreadCount(userId: string): Promise<number> {
  try {
    await ensureNotificationsSchema();
    const rows = await prisma.$queryRaw<Array<{ n: number | bigint }>>`
      SELECT COUNT(*) AS n FROM "Notification"
      WHERE "userId" = ${userId} AND "readAt" IS NULL`;
    return Number(rows[0]?.n ?? 0);
  } catch {
    return 0;
  }
}

export async function markRead(id: string, userId: string): Promise<void> {
  try {
    await ensureNotificationsSchema();
    await prisma.$executeRaw`
      UPDATE "Notification" SET "readAt" = datetime('now')
      WHERE "id" = ${id} AND "userId" = ${userId} AND "readAt" IS NULL`;
  } catch {
    /* table not ready — best-effort */
  }
}

export async function markAllRead(userId: string): Promise<void> {
  try {
    await ensureNotificationsSchema();
    await prisma.$executeRaw`
      UPDATE "Notification" SET "readAt" = datetime('now')
      WHERE "userId" = ${userId} AND "readAt" IS NULL`;
  } catch {
    /* best-effort */
  }
}
