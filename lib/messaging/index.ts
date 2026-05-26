/**
 * Messaging layer entry point.
 *
 * `sendMessage` is the one call the API, the UI, and automations use to send
 * over any channel. It dispatches to the right adapter, persists the Message,
 * writes a timeline Activity, and fires the `message.sent` webhook.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { dispatchEvent } from "@/lib/webhooks/outbound";
import { logActivity } from "@/lib/crm/activity";
import { gmailAdapter } from "./gmail";
import { smsAdapter } from "./sms";
import { whatsappAdapter } from "./whatsapp";
import type {
  ChannelAdapter,
  ChannelType,
  OutboundMessage,
  SendResult,
} from "./types";

const adapters: Record<ChannelType, ChannelAdapter> = {
  email: gmailAdapter,
  sms: smsAdapter,
  whatsapp: whatsappAdapter,
};

export function getAdapter(channel: ChannelType): ChannelAdapter {
  return adapters[channel];
}

/** Configuration status of every channel — surfaced on the Channels screen. */
export function channelStatus(): Array<{ channel: ChannelType; configured: boolean }> {
  return (Object.keys(adapters) as ChannelType[]).map((channel) => ({
    channel,
    configured: adapters[channel].isConfigured(),
  }));
}

export interface SendOutcome {
  messageId: string;
  result: SendResult;
}

export async function sendMessage(msg: OutboundMessage): Promise<SendOutcome> {
  const adapter = adapters[msg.channel];
  const result = await adapter.send(msg);

  const message = await prisma.message.create({
    data: {
      channel: msg.channel,
      direction: "outbound",
      status: result.status,
      providerId: result.providerId,
      dealId: msg.dealId,
      personId: msg.personId,
      toAddress: msg.to,
      subject: msg.subject,
      body: msg.body,
      error: result.error,
      sentAt: result.ok ? new Date() : undefined,
      meta: msg.meta
        ? (msg.meta as unknown as Prisma.InputJsonValue)
        : undefined,
    },
  });

  if (msg.dealId) {
    await logActivity({
      dealId: msg.dealId,
      type: msg.channel,
      title: `${label(msg.channel)}${result.status === "mock" ? " (mock)" : ""} sent`,
      body: msg.body.slice(0, 280),
      authorName: msg.agentId ?? "API",
    });
  }

  await dispatchEvent("message.sent", {
    messageId: message.id,
    channel: msg.channel,
    to: msg.to,
    status: result.status,
    dealId: msg.dealId,
  });

  return { messageId: message.id, result };
}

function label(channel: ChannelType): string {
  return channel === "email" ? "Email" : channel === "sms" ? "SMS" : "WhatsApp";
}

export { recordInbound, updateMessageStatus } from "./inbound";
export type { OutboundMessage, SendResult, ChannelType } from "./types";
