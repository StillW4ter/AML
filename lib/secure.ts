/**
 * AES-256-GCM helpers for encrypting secrets at rest (OAuth refresh tokens,
 * gateway keys). The key is derived from ENCRYPTION_KEY in the environment.
 */
import crypto from "node:crypto";
import { env } from "./env";

function key(): Buffer {
  const material = env.encryptionKey ?? "dev-insecure-key-please-set-ENCRYPTION_KEY";
  return crypto.createHash("sha256").update(material).digest(); // 32 bytes
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, enc].map((b) => b.toString("base64")).join(".");
}

export function decrypt(blob: string): string {
  const [ivB, tagB, dataB] = blob.split(".");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(ivB, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function encryptJson(value: unknown): string {
  return encrypt(JSON.stringify(value));
}

export function decryptJson<T>(blob: string): T {
  return JSON.parse(decrypt(blob)) as T;
}
