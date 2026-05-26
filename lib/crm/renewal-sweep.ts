/**
 * Renewal sweep — runs on every authenticated page load (throttled).
 *
 * For each policy with an expiry:
 *   • Creates a deduped notification for the assigned agent when days-until
 *     hits a schedule offset (e.g. 30, 14) or is inside the daily-last-N window.
 *   • The first time the policy crosses the largest offset (default 30 days),
 *     automatically opens a renewal Deal for the contact, and tags the
 *     InsuranceProfile so it doesn't open another for the same expiry.
 */
import { prisma } from "@/lib/db";
import { ensureCustomizationSchema } from "./ensure-schema";
import {
  createNotification,
  ensureNotificationsSchema,
} from "./notifications";
import { getRenewalSchedule } from "./settings";
import { createInsuranceForPerson } from "./leads";

const THROTTLE_MS = 5 * 60 * 1000;
let lastSweepAt = 0;

/** Throttled, fire-and-forget entry point — safe to call on every request. */
export function maybeSweepRenewals(): void {
  if (Date.now() - lastSweepAt < THROTTLE_MS) return;
  lastSweepAt = Date.now();
  void sweepNow().catch(() => undefined);
}

export interface SweepResult {
  notificationsCreated: number;
  renewalDealsOpened: number;
}

export async function sweepNow(): Promise<SweepResult> {
  await ensureCustomizationSchema();
  await ensureNotificationsSchema();
  const schedule = await getRenewalSchedule();

  const rows = await prisma.$queryRawUnsafe<
    Array<{
      dealId: string;
      policyExpiry: string;
      renewalDealId: string | null;
    }>
  >(
    `SELECT "dealId", "policyExpiry", "renewalDealId" FROM "InsuranceProfile"
     WHERE "policyExpiry" IS NOT NULL AND "policyExpiry" != ''`,
  );
  if (!rows.length) {
    return { notificationsCreated: 0, renewalDealsOpened: 0 };
  }

  const deals = await prisma.deal.findMany({
    where: { id: { in: rows.map((r) => r.dealId) } },
    include: { person: true, owner: true },
  });
  const dealById = new Map(deals.map((d) => [d.id, d]));

  const firstOffset = schedule.offsets.length
    ? Math.max(...schedule.offsets)
    : 30;
  const now = Date.now();
  let notificationsCreated = 0;
  let renewalDealsOpened = 0;

  for (const row of rows) {
    const deal = dealById.get(row.dealId);
    if (!deal) continue;
    const expTs = new Date(row.policyExpiry).getTime();
    if (Number.isNaN(expTs)) continue;
    const daysUntil = Math.ceil((expTs - now) / 86_400_000);
    if (daysUntil < 0) continue; // expired — surfaced on the Renewals page

    const inWindow =
      schedule.offsets.includes(daysUntil) ||
      daysUntil <= schedule.dailyForLastDays;

    if (inWindow && deal.ownerId) {
      const made = await createNotification({
        userId: deal.ownerId,
        type: "renewal",
        title: `${deal.person.name} — policy expires in ${daysUntil} ${
          daysUntil === 1 ? "day" : "days"
        }`,
        body: `${deal.reference} · ${deal.lineOfBusiness}`,
        link: "/crm/renewals",
        dedupeKey: `renewal:${deal.id}:d${daysUntil}`,
      });
      if (made) notificationsCreated++;
    }

    // Auto-open a renewal deal once the policy enters the first offset window.
    if (daysUntil <= firstOffset && !row.renewalDealId) {
      const created = await createInsuranceForPerson(
        deal.person.id,
        deal.lineOfBusiness,
        `Renewal — ${deal.reference}`,
      );
      if (created) {
        await prisma.$executeRaw`
          UPDATE "InsuranceProfile" SET "renewalDealId" = ${created.dealId}
          WHERE "dealId" = ${deal.id}`;
        renewalDealsOpened++;
        if (deal.ownerId) {
          await createNotification({
            userId: deal.ownerId,
            type: "renewal-deal",
            title: `Renewal opened — ${deal.person.name}`,
            body: `New deal ${created.reference} · ${deal.lineOfBusiness}`,
            link: "/crm",
            dedupeKey: `renewal-deal:${deal.id}:${created.dealId}`,
          });
        }
      }
    }
  }

  return { notificationsCreated, renewalDealsOpened };
}
