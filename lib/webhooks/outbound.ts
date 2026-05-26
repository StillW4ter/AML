/**
 * Outbound webhooks — the CRM POSTs signed event payloads to subscriber URLs.
 *
 * Each attempt is recorded in WebhookDelivery for audit and future retry.
 * `dispatchEvent` is intentionally fail-safe: a webhook problem must never
 * break the CRM operation that triggered it.
 */
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type WebhookEvent =
  | "lead.created"
  | "lead.updated"
  | "deal.stage_changed"
  | "deal.won"
  | "deal.lost"
  | "message.received"
  | "message.sent"
  | "task.due";

interface EndpointRow {
  id: string;
  url: string;
  secret: string;
  events: string;
}

export async function dispatchEvent(
  event: WebhookEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  let endpoints: EndpointRow[] = [];
  try {
    endpoints = await prisma.webhookEndpoint.findMany({ where: { active: true } });
  } catch {
    return; // DB unavailable — silently skip, never break the caller.
  }

  const subscribers = endpoints.filter((e) => {
    const events = e.events.split(",").map((s) => s.trim());
    return events.includes("*") || events.includes(event);
  });

  await Promise.allSettled(subscribers.map((e) => deliver(e, event, payload)));
}

async function deliver(
  endpoint: EndpointRow,
  event: WebhookEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  const body = JSON.stringify({
    event,
    payload,
    sentAt: new Date().toISOString(),
  });
  const signature = crypto
    .createHmac("sha256", endpoint.secret)
    .update(body)
    .digest("hex");

  const delivery = await prisma.webhookDelivery.create({
    data: {
      endpointId: endpoint.id,
      event,
      payload: payload as unknown as Prisma.InputJsonValue,
      status: "pending",
    },
  });

  try {
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-gurdena-event": event,
        "x-gurdena-signature": `sha256=${signature}`,
      },
      body,
      signal: AbortSignal.timeout(8000),
    });
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: res.ok ? "success" : "failed",
        attempts: 1,
        responseCode: res.status,
        lastAttemptAt: new Date(),
      },
    });
  } catch {
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: { status: "failed", attempts: 1, lastAttemptAt: new Date() },
    });
  }
}
