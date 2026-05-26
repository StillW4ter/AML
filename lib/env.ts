/**
 * Typed environment access for the CRM.
 *
 * `configured.*` flags tell the messaging layer whether a provider has real
 * credentials. When a flag is false the matching adapter runs in mock mode:
 * sends are logged and stored but nothing leaves the building.
 */

function read(key: string): string | undefined {
  const value = process.env[key];
  return value && value.trim() ? value.trim() : undefined;
}

export const env = {
  appBaseUrl: read("APP_BASE_URL") ?? "http://localhost:5173",
  ingestSecret: read("CRM_INGEST_SECRET"),
  encryptionKey: read("ENCRYPTION_KEY"),

  google: {
    clientId: read("GOOGLE_CLIENT_ID"),
    clientSecret: read("GOOGLE_CLIENT_SECRET"),
    redirectUri:
      read("GOOGLE_REDIRECT_URI") ??
      "http://localhost:5173/api/integrations/gmail/callback",
  },

  sms: {
    provider: read("SMS_PROVIDER") ?? "smsoffice",
    officeKey: read("SMS_OFFICE_KEY"),
    officeSender: read("SMS_OFFICE_SENDER"),
    webhookSecret: read("SMS_WEBHOOK_SECRET"),
  },

  whatsapp: {
    enabled: read("WHATSAPP_ENABLED") === "true",
    sessionDir: read("WHATSAPP_SESSION_DIR") ?? "runtime/whatsapp",
  },
} as const;

export const configured = {
  /** Gmail OAuth client is set up. */
  gmail: Boolean(env.google.clientId && env.google.clientSecret),
  /** smsoffice.ge key + registered sender are set. */
  sms: Boolean(env.sms.officeKey && env.sms.officeSender),
  /** WhatsApp (Baileys) is switched on. */
  whatsapp: env.whatsapp.enabled,
} as const;
