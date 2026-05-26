/**
 * API-key authentication for /api/v1/* endpoints.
 *
 * Keys are issued once, stored as a SHA-256 hash, and carry comma-separated
 * scopes. The ingest and provider-webhook endpoints use shared secrets
 * instead (see `verifyIngestSecret`).
 */
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { errors } from "./respond";

export type Scope =
  | "leads:read"
  | "leads:write"
  | "messages:send"
  | "webhooks:manage"
  | "*";

export interface AuthContext {
  keyId: string;
  scopes: string[];
}

/** SHA-256 of a raw key — what we store and look up by. */
export function hashKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/** Generate a new API key: returns the raw key (show once) and its record fields. */
export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = `gk_live_${crypto.randomBytes(24).toString("hex")}`;
  return { raw, hash: hashKey(raw), prefix: raw.slice(0, 12) };
}

function bearer(req: Request): string | null {
  const header = req.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  return token || null;
}

export function hasScope(scopes: string[], needed: Scope): boolean {
  return scopes.includes("*") || scopes.includes(needed);
}

/**
 * Authenticate a request and assert a scope.
 * Returns an AuthContext on success, or a NextResponse error to return as-is.
 */
export async function requireScope(
  req: Request,
  needed: Scope,
): Promise<AuthContext | NextResponse> {
  const token = bearer(req);
  if (!token) return errors.unauthorized();

  const key = await prisma.apiKey.findUnique({ where: { hash: hashKey(token) } });
  if (!key || key.revokedAt) return errors.unauthorized();

  const scopes = key.scopes
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);
  if (!hasScope(scopes, needed)) return errors.forbidden(needed);

  // Best-effort last-used stamp; never block the request on it.
  prisma.apiKey
    .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);

  return { keyId: key.id, scopes };
}

export function isAuthError(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

/** Constant-time comparison for shared secrets. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/** Verify the X-Ingest-Secret header on the public lead-capture endpoint. */
export function verifyIngestSecret(req: Request): boolean {
  if (!env.ingestSecret) return false;
  const provided = req.headers.get("x-ingest-secret") ?? "";
  return provided.length > 0 && safeEqual(provided, env.ingestSecret);
}
