/**
 * Consistent JSON response envelope for the CRM API.
 *
 * Success: the resource (or { data, ... }) as-is.
 * Error:   { error: { code, message, details? } }
 */
import { NextResponse } from "next/server";

export function ok(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function created(data: unknown): NextResponse {
  return NextResponse.json(data, { status: 201 });
}

export function fail(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
): NextResponse {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

export const errors = {
  unauthorized: () =>
    fail("unauthorized", "Missing or invalid API key", 401),
  forbidden: (scope: string) =>
    fail("forbidden", `API key is missing the required scope: ${scope}`, 403),
  notFound: (what = "Resource") =>
    fail("not_found", `${what} not found`, 404),
  validation: (details: unknown) =>
    fail("validation_error", "Request failed validation", 422, details),
  rateLimited: () =>
    fail("rate_limited", "Too many requests", 429),
  server: (message = "Internal error") =>
    fail("internal_error", message, 500),
};

/** Parse a JSON request body, returning null on malformed input. */
export async function readJson<T = unknown>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
