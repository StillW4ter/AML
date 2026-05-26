"use client";

/** The pipeline board (kanban) and the table view. */
import { useState } from "react";
import {
  Car,
  HeartPulse,
  Home,
  Plane,
  PawPrint,
  Building2,
  GripVertical,
  ArrowUpDown,
  Check,
} from "lucide-react";
import { useI18n } from "./i18n";
import { LOB_KEYS } from "@/lib/i18n";
import { money, initials, avatarTint } from "./format";
import type { StageDTO, DealCardDTO } from "@/lib/crm/queries";

const LOB_ICON: Record<string, typeof Car> = {
  auto: Car,
  health: HeartPulse,
  home: Home,
  travel: Plane,
  pet: PawPrint,
  commercial: Building2,
};

const OPEN_TINTS = ["#94a3b8", "#38bdf8", "#6366f1", "#a855f7", "#f59e0b"];

function stageColor(stage: StageDTO): string {
  if (stage.type === "won") return "#10b981";
  if (stage.type === "lost") return "#f43f5e";
  return OPEN_TINTS[stage.position % OPEN_TINTS.length];
}

interface ViewProps {
  stages: StageDTO[];
  deals: DealCardDTO[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (dealId: string, stageId: string) => void;
}

// --- Board ------------------------------------------------------------------

export function PipelineBoard({
  stages,
  deals,
  selectedId,
  onSelect,
  onMove,
}: ViewProps) {
  const { t, loc } = useI18n();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);

  return (
    <div className="flex h-full gap-3 overflow-x-auto px-4 py-4">
      {stages.map((stage) => {
        const stageDeals = deals.filter((d) => d.stageId === stage.id);
        const total = stageDeals.reduce(
          (sum, d) => sum + (d.estimatedValue ?? 0),
          0,
        );
        const color = stageColor(stage);
        const isOver = overStage === stage.id;

        return (
          <section
            key={stage.id}
            onDragOver={(e) => {
              e.preventDefault();
              setOverStage(stage.id);
            }}
            onDragLeave={() => setOverStage((s) => (s === stage.id ? null : s))}
            onDrop={() => {
              if (draggedId) onMove(draggedId, stage.id);
              setDraggedId(null);
              setOverStage(null);
            }}
            className={`flex w-[286px] shrink-0 flex-col rounded-xl border transition-colors ${
              isOver
                ? "border-[#4f46e5]/40 bg-[#eef2ff]/60"
                : "border-[#e6e8ec] bg-[#f0f1f4]"
            }`}
          >
            <header className="flex items-center justify-between px-3.5 pb-2 pt-3">
              <div className="flex items-center gap-2">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <h3 className="text-[13px] font-semibold text-[#1f2430]">
                  {loc(stage.name, stage.nameKa)}
                </h3>
                <span className="rounded-md bg-white px-1.5 py-0.5 text-[11px] font-semibold text-[#6b7280]">
                  {stageDeals.length}
                </span>
              </div>
              <span className="text-[11px] font-medium text-[#9aa1ab]">
                {money(total)}
              </span>
            </header>

            <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-2">
              {stageDeals.length === 0 && (
                <p className="px-2 py-6 text-center text-[11px] text-[#9aa1ab]">
                  {t("noDeals")}
                </p>
              )}
              {stageDeals.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  selected={deal.id === selectedId}
                  onSelect={() => onSelect(deal.id)}
                  onDragStart={() => setDraggedId(deal.id)}
                  onDragEnd={() => {
                    setDraggedId(null);
                    setOverStage(null);
                  }}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- Card -------------------------------------------------------------------

function DealCard({
  deal,
  selected,
  onSelect,
  onDragStart,
  onDragEnd,
}: {
  deal: DealCardDTO;
  selected: boolean;
  onSelect: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const { t, loc } = useI18n();
  const Icon = LOB_ICON[deal.lineOfBusiness] ?? Car;
  const name = loc(deal.personName, deal.personNameKa);
  const tint = avatarTint(deal.personName);

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      className={`group cursor-pointer rounded-lg border bg-white p-3 shadow-sm transition hover:shadow-md ${
        selected
          ? "border-[#4f46e5] ring-2 ring-[#4f46e5]/15"
          : "border-[#e6e8ec] hover:border-[#cdd0d6]"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-bold"
            style={{ backgroundColor: tint.bg, color: tint.fg }}
          >
            {initials(deal.personName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-[#1f2430]">
              {name}
            </p>
            <p className="text-[11px] text-[#9aa1ab]">{deal.reference}</p>
          </div>
        </div>
        <GripVertical className="size-3.5 shrink-0 text-[#cdd0d6] opacity-0 transition group-hover:opacity-100" />
      </div>

      <div className="mb-2.5 flex items-center gap-1.5 text-[12px] text-[#4b5563]">
        <Icon className="size-3.5 text-[#9aa1ab]" />
        <span className="truncate">
          {loc(deal.request, deal.requestKa) || t(LOB_KEYS[deal.lineOfBusiness] ?? "lobAuto")}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[13px] font-bold text-[#1f2430]">
          {money(deal.estimatedValue, deal.currency)}
        </span>
        {deal.missingCount > 0 ? (
          <span className="rounded-md bg-[#fff7ed] px-1.5 py-0.5 text-[10px] font-semibold text-[#c2620e]">
            {deal.missingCount} {t("missing")}
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-md bg-[#ecfdf5] px-1.5 py-0.5 text-[10px] font-semibold text-[#047857]">
            <Check className="size-3" />
            {t("quoteReady")}
          </span>
        )}
      </div>

      <div className="mt-2.5 flex items-center justify-between border-t border-[#f1f2f4] pt-2 text-[11px]">
        <span className="truncate text-[#6b7280]">
          {deal.ownerName ?? t("unassigned")}
        </span>
        {deal.source && (
          <span className="rounded border border-[#e6e8ec] px-1.5 py-0.5 text-[#9aa1ab]">
            {deal.source}
          </span>
        )}
      </div>
    </article>
  );
}

// --- Table ------------------------------------------------------------------

type SortKey = "name" | "value" | "missing" | "stage";

export function TableView({ stages, deals, selectedId, onSelect }: ViewProps) {
  const { t, loc } = useI18n();
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [asc, setAsc] = useState(false);

  const stageName = (id: string) => {
    const s = stages.find((x) => x.id === id);
    return s ? loc(s.name, s.nameKa) : "—";
  };
  const stagePos = (id: string) =>
    stages.find((x) => x.id === id)?.position ?? 0;

  const sorted = [...deals].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "name") cmp = a.personName.localeCompare(b.personName);
    else if (sortKey === "value")
      cmp = (a.estimatedValue ?? 0) - (b.estimatedValue ?? 0);
    else if (sortKey === "missing") cmp = a.missingCount - b.missingCount;
    else cmp = stagePos(a.stageId) - stagePos(b.stageId);
    return asc ? cmp : -cmp;
  });

  const head = (key: SortKey, label: string) => (
    <th
      onClick={() => {
        if (sortKey === key) setAsc((v) => !v);
        else {
          setSortKey(key);
          setAsc(false);
        }
      }}
      className="cursor-pointer select-none px-3 py-2.5 text-left font-semibold text-[#6b7280] hover:text-[#1f2430]"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown
          className={`size-3 ${sortKey === key ? "text-[#4f46e5]" : "text-[#cdd0d6]"}`}
        />
      </span>
    </th>
  );

  return (
    <div className="overflow-auto p-4">
      <table className="w-full min-w-[840px] border-separate border-spacing-0 overflow-hidden rounded-xl border border-[#e6e8ec] bg-white text-[13px]">
        <thead className="bg-[#fafbfc] text-[11px] uppercase tracking-wide">
          <tr>
            {head("name", t("name"))}
            <th className="px-3 py-2.5 text-left font-semibold text-[#6b7280]">
              {t("request")}
            </th>
            {head("stage", t("stage"))}
            <th className="px-3 py-2.5 text-left font-semibold text-[#6b7280]">
              {t("phone")}
            </th>
            {head("missing", t("missing"))}
            <th className="px-3 py-2.5 text-left font-semibold text-[#6b7280]">
              {t("owner")}
            </th>
            {head("value", t("value"))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((deal) => {
            const tint = avatarTint(deal.personName);
            return (
              <tr
                key={deal.id}
                onClick={() => onSelect(deal.id)}
                className={`cursor-pointer border-t border-[#f1f2f4] transition-colors ${
                  deal.id === selectedId
                    ? "bg-[#eef2ff]"
                    : "hover:bg-[#fafbfc]"
                }`}
              >
                <td className="border-t border-[#f1f2f4] px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-bold"
                      style={{ backgroundColor: tint.bg, color: tint.fg }}
                    >
                      {initials(deal.personName)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#1f2430]">
                        {loc(deal.personName, deal.personNameKa)}
                      </p>
                      <p className="text-[11px] text-[#9aa1ab]">
                        {deal.reference}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="border-t border-[#f1f2f4] px-3 py-2.5 text-[#4b5563]">
                  {loc(deal.request, deal.requestKa) || "—"}
                </td>
                <td className="border-t border-[#f1f2f4] px-3 py-2.5 text-[#4b5563]">
                  {stageName(deal.stageId)}
                </td>
                <td className="border-t border-[#f1f2f4] px-3 py-2.5 text-[#6b7280]">
                  {deal.personPhone ?? "—"}
                </td>
                <td className="border-t border-[#f1f2f4] px-3 py-2.5">
                  {deal.missingCount > 0 ? (
                    <span className="rounded-md bg-[#fff7ed] px-1.5 py-0.5 text-[11px] font-semibold text-[#c2620e]">
                      {deal.missingCount}
                    </span>
                  ) : (
                    <span className="rounded-md bg-[#ecfdf5] px-1.5 py-0.5 text-[11px] font-semibold text-[#047857]">
                      0
                    </span>
                  )}
                </td>
                <td className="border-t border-[#f1f2f4] px-3 py-2.5 text-[#4b5563]">
                  {deal.ownerName ?? t("unassigned")}
                </td>
                <td className="border-t border-[#f1f2f4] px-3 py-2.5 font-semibold text-[#1f2430]">
                  {money(deal.estimatedValue, deal.currency)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
