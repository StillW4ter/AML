/**
 * Normalize an inbound message from any channel into the CRM:
 * match the contact, attach to their most recent open deal, store the
 * Message + a timeline Activity, and fire the `message.received` webhook.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/crm/util";
import { logActivity } from "@/lib/crm/activity";
import { dispatchEvent } from "@/lib/webhooks/outbound";
import type { InboundMessage } from "./types";

export interface RecordInboundResult {
  messageId: string;
  dealId?: string;
  personId?: string;
  matched: boolean;
}

export async function recordInbound(
  inbound: InboundMessage,
): Promise<RecordInboundResult> {
  // --- Match the contact ----------------------------------------------------
  let person = null;
  if (inbound.channel === "email") {
    const email = inbound.from.toLowerCase();
    person = await prisma.person.findFirst({ where: { email } });
  } else {
    const phone = normalizePhone(inbound.from);
    if (phone) person = await prisma.person.findFirst({ where: { phone } });
  }

  // --- Attach to the contact's most recent open deal -----------------------
  const deal = person
    ? await prisma.deal.findFirst({
        where: { personId: person.id, status: "open" },
        orderBy: { updatedAt: "desc" },
      })
    : null;

  const message = await prisma.message.create({
    data: {
      channel: inbound.channel,
      direction: "inbound",
      status: "received",
      providerId: inbound.providerId,
      dealId: deal?.id,
      personId: person?.id,
      fromAddress: inbound.from,
      toAddress: inbound.to,
      subject: inbound.subject,
      body: inbound.body,
      meta: inbound.meta
        ? (inbound.meta as unknown as Prisma.InputJsonValue)
        : undefined,
      createdAt: inbound.receivedAt,
    },
  });

  if (deal || person) {
    await logActivity({
      dealId: deal?.id,
      personId: person?.id,
      type: inbound.channel,
      title: `Inbound ${inbound.channel}`,
      body: inbound.body.slice(0, 280),
      authorName: person?.name ?? inbound.from,
    });
  }

  await dispatchEvent("message.received", {
    messageId: message.id,
    channel: inbound.channel,
    from: inbound.from,
    dealId: deal?.id,
    personId: person?.id,
  });

  return {
    messageId: message.id,
    dealId: deal?.id,
    personId: person?.id,
    matched: Boolean(person),
  };
}

/** Update the delivery status of an already-sent message by provider id. */
export async function updateMessageStatus(
  providerId: string,
  status: "delivered" | "read" | "failed",
  error?: string,
): Promise<boolean> {
  const message = await prisma.message.findFirst({ where: { providerId } });
  if (!message) return false;
  await prisma.message.update({
    where: { id: message.id },
    data: { status, error },
  });
  return true;
}
