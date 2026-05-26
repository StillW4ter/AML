/**
 * SMS channel — smsoffice.ge HTTP API v2.
 *
 * The adapter implements a generic `SmsGateway` interface so a second
 * gateway can be added as one file plus an SMS_PROVIDER env switch.
 *
 * smsoffice.ge send:    GET/POST https://smsoffice.ge/api/v2/send/
 *   params: key, destination, sender, content, urgent
 * smsoffice.ge balance: GET https://smsoffice.ge/api/v2/getBalance/?key=...
 */
import { configured, env } from "@/lib/env";
import type { ChannelAdapter, OutboundMessage, SendResult } from "./types";

export interface SmsGateway {
  name: string;
  send(
    to: string,
    body: string,
    opts?: { urgent?: boolean },
  ): Promise<SendResult>;
  getBalance(): Promise<number | null>;
}

const SMSOFFICE_BASE = "https://smsoffice.ge/api/v2";

/** Strip everything but digits — smsoffice expects a bare MSISDN. */
function toMsisdn(phone: string): string {
  return phone.replace(/\D/g, "");
}

export const smsofficeGateway: SmsGateway = {
  name: "smsoffice",

  async send(to, body, opts): Promise<SendResult> {
    if (!configured.sms) {
      return {
        ok: true,
        status: "mock",
        raw: { to, body, note: "SMS_OFFICE_KEY/SENDER not set — mock send" },
      };
    }

    const url = new URL(`${SMSOFFICE_BASE}/send/`);
    url.searchParams.set("key", env.sms.officeKey as string);
    url.searchParams.set("destination", toMsisdn(to));
    url.searchParams.set("sender", env.sms.officeSender as string);
    url.searchParams.set("content", body);
    url.searchParams.set("urgent", opts?.urgent ? "true" : "false");

    try {
      const res = await fetch(url, {
        method: "POST",
        signal: AbortSignal.timeout(15000),
      });
      const text = await res.text();
      if (!res.ok) {
        return { ok: false, status: "failed", error: `HTTP ${res.status}: ${text}` };
      }

      // v2 may answer with JSON ({Success, Output, ...}) or a bare id/code.
      let providerId: string | undefined;
      let success = true;
      try {
        const json = JSON.parse(text) as Record<string, unknown>;
        success = json.Success !== false && json.success !== false;
        providerId = String(json.Output ?? json.output ?? json.id ?? "").trim() || undefined;
      } catch {
        providerId = text.trim() || undefined;
      }

      return success
        ? { ok: true, status: "sent", providerId, raw: text }
        : { ok: false, status: "failed", error: text, raw: text };
    } catch (err) {
      return { ok: false, status: "failed", error: (err as Error).message };
    }
  },

  async getBalance(): Promise<number | null> {
    if (!configured.sms) return null;
    try {
      const url = new URL(`${SMSOFFICE_BASE}/getBalance/`);
      url.searchParams.set("key", env.sms.officeKey as string);
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const text = (await res.text()).trim();
      const numeric = Number(text.replace(/[^\d.]/g, ""));
      return Number.isFinite(numeric) ? numeric : null;
    } catch {
      return null;
    }
  },
};

const gateways: Record<string, SmsGateway> = {
  smsoffice: smsofficeGateway,
};

/** The gateway selected by SMS_PROVIDER (defaults to smsoffice). */
export function activeGateway(): SmsGateway {
  return gateways[env.sms.provider] ?? smsofficeGateway;
}

export const smsAdapter: ChannelAdapter = {
  channel: "sms",
  isConfigured: () => configured.sms,
  async send(msg: OutboundMessage): Promise<SendResult> {
    return activeGateway().send(msg.to, msg.body, {
      urgent: msg.meta?.urgent === true,
    });
  },
};
