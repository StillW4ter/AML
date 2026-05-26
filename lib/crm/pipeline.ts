/** Stage moves with stage-gate enforcement. */
import { prisma } from "@/lib/db";
import { logActivity } from "./activity";
import { getRequiredKeysForLob } from "./field-definitions";
import { dispatchEvent } from "@/lib/webhooks/outbound";

/**
 * Sentinel a stage can list in `requiredFields` to mean "require every
 * quote-critical field for this deal's line of business" — so one gate works
 * across auto, health, home, travel, pet, and commercial deals.
 */
export const LOB_REQUIRED = "lob:required";

export interface StageMoveTarget {
  stageId?: string;
  /** Move by stage name (case-insensitive) if no id is given. */
  stage?: string;
  /** Bypass the stage gate (manager override). */
  force?: boolean;
}

export interface StageMoveResult {
  ok: boolean;
  /** True when the move was rejected by a stage gate. */
  blocked?: boolean;
  missingFields?: string[];
  dealId?: string;
  stage?: string;
  status?: string;
  error?: string;
}

export async function moveDealToStage(
  dealId: string,
  target: StageMoveTarget,
  actor?: { id?: string; name?: string },
): Promise<StageMoveResult> {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      profile: true,
      pipeline: { include: { stages: { orderBy: { position: "asc" } } } },
    },
  });
  if (!deal) return { ok: false, error: "deal_not_found" };

  type StageRow = {
    id: string;
    name: string;
    nameKa: string | null;
    type: string;
    requiredFields: unknown;
  };
  const stages: StageRow[] = deal.pipeline.stages ?? [];
  const stage = target.stageId
    ? stages.find((s) => s.id === target.stageId)
    : stages.find(
        (s) => s.name.toLowerCase() === (target.stage ?? "").toLowerCase(),
      );
  if (!stage) return { ok: false, error: "stage_not_found" };

  // --- Stage gate -----------------------------------------------------------
  if (!target.force && stage.requiredFields) {
    const declared = (stage.requiredFields as unknown as string[]) ?? [];
    // Expand the LOB sentinel into this deal's required field keys.
    const required: string[] = [];
    for (const key of declared) {
      if (key === LOB_REQUIRED) {
        required.push(...(await getRequiredKeysForLob(deal.lineOfBusiness)));
      } else {
        required.push(key);
      }
    }
    if (required.length) {
      const stored = Array.isArray(deal.profile?.fields)
        ? (deal.profile.fields as Array<Record<string, unknown>>)
        : [];
      const valueByKey = new Map<string, string>();
      for (const f of stored) {
        if (f && typeof f.key === "string") {
          valueByKey.set(f.key, String(f.value ?? ""));
        }
      }
      const missing = required.filter(
        (key) => !(valueByKey.get(key) ?? "").trim(),
      );
      if (missing.length) {
        return { ok: false, blocked: true, missingFields: missing };
      }
    }
  }

  const status =
    stage.type === "won" ? "won" : stage.type === "lost" ? "lost" : "open";

  await prisma.deal.update({
    where: { id: dealId },
    data: {
      stageId: stage.id,
      status,
      closedAt: status === "open" ? null : new Date(),
    },
  });

  await logActivity({
    dealId,
    type: "status",
    title: `Moved to ${stage.name}`,
    titleKa: stage.nameKa ? `გადავიდა: ${stage.nameKa}` : undefined,
    authorId: actor?.id,
    authorName: actor?.id ? undefined : actor?.name ?? "API",
  });

  await dispatchEvent("deal.stage_changed", {
    dealId,
    stage: stage.name,
    status,
  });
  if (status === "won") await dispatchEvent("deal.won", { dealId });
  if (status === "lost") await dispatchEvent("deal.lost", { dealId });

  return { ok: true, dealId, stage: stage.name, status };
}
