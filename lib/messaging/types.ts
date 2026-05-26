/** Shared types for the unified messaging layer. */

export type ChannelType = "email" | "sms" | "whatsapp";

export interface OutboundMessage {
  channel: ChannelType;
  /** Phone in E.164 for SMS/WhatsApp, email address for email. */
  to: string;
  body: string;
  /** Email subject — ignored by SMS / WhatsApp. */
  subject?: string;
  dealId?: string;
  personId?: string;
  /** Which agent's connected channel to send from (Gmail mailbox / WA session). */
  agentId?: string;
  meta?: Record<string, unknown>;
}

export interface SendResult {
  ok: boolean;
  /** `mock` means the provider has no credentials — the send was simulated. */
  status: "sent" | "queued" | "failed" | "mock";
  providerId?: string;
  error?: string;
  raw?: unknown;
}

export interface InboundMessage {
  channel: ChannelType;
  /** Sender — phone or email address. */
  from: string;
  to?: string;
  body: string;
  subject?: string;
  providerId?: string;
  receivedAt: Date;
  meta?: Record<string, unknown>;
}

/** Every channel implements this so callers never branch on the provider. */
export interface ChannelAdapter {
  channel: ChannelType;
  /** False → adapter runs in mock mode. */
  isConfigured(): boolean;
  send(msg: OutboundMessage): Promise<SendResult>;
}
