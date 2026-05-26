/** Small CRM utilities: phone normalization and deal references. */
import { prisma } from "@/lib/db";

/**
 * Normalize a phone number to E.164, biased to Georgia (+995).
 * Georgian mobile numbers are 9 digits starting with 5.
 */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const cleaned = input.replace(/[^\d+]/g, "");
  if (!cleaned) return null;

  if (cleaned.startsWith("+")) return cleaned;

  const digits = cleaned.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("995")) return `+${digits}`;
  if (digits.length === 9 && digits.startsWith("5")) return `+995${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("0")) return `+995${digits.slice(1)}`;
  return `+${digits}`;
}

/** Generate the next human-readable deal reference, e.g. LD-1042. */
export async function nextDealReference(): Promise<string> {
  const count = await prisma.deal.count();
  return `LD-${1024 + count}`;
}

/** A reasonably unique random token for share links / secrets. */
export function randomToken(bytes = 18): string {
  // Web Crypto is available in both the Node and Edge runtimes.
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}
