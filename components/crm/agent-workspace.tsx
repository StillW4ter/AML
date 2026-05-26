"use client";

/**
 * Pipeline view — the kanban board / table, deal panel, and new-lead dialog.
 * Rendered inside the shared CrmShell (which provides the sidebar + i18n).
 */
import { useMemo, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Columns3,
  Table2,
  TrendingUp,
  CircleDot,
  Sparkles,
} from "lucide-react";
import { useI18n } from "./i18n";
import { PipelineBoard, TableView } from "./pipeline-views";
import { DealPanel } from "./deal-panel";
import { NewLeadDialog } from "./new-lead-dialog";
import { LOB_KEYS } from "@/lib/i18n";
import type { BoardData, DealDetailDTO } from "@/lib/crm/queries";
import { moveStageAction, getDealDetailAction } from "@/app/crm/actions";

const LOBS = ["auto", "health", "home", "travel", "pet", "commercial"];

export function PipelineView({ board }: { board: BoardData }) {
  const { t } = useI18n();
  const router = useRouter();

  const [view, setView] = useState<"board" | "table">("board");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DealDetailDTO | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [lobFilter, setLobFilter] = useState("");
  const [, startTransition] = useTransition();

  const [deals, applyMove] = useOptimistic(
    board.deals,
    (current, move: { id: string; stageId: string }) =>
      current.map((d) => (d.id === move.id ? { ...d, stageId: move.stageId } : d)),
  );

  const visibleDeals = useMemo(() => {
    const q = query.trim().toLowerCase();
    return deals.filter((d) => {
      if (ownerFilter && d.ownerId !== ownerFilter) return false;
      if (lobFilter && d.lineOfBusiness !== lobFilter) return false;
      if (q) {
        const hay = `${d.personName} ${d.personNameKa ?? ""} ${d.reference} ${
          d.request ?? ""
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [deals, query, ownerFilter, lobFilter]);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 5000);
  }

  async function openDeal(id: string) {
    setSelectedId(id);
    setLoadingDetail(true);
    setDetail(await getDealDetailAction(id));
    setLoadingDetail(false);
  }

  async function reloadDetail(id: string) {
    setDetail(await getDealDetailAction(id));
  }

  function moveStage(dealId: string, stageId: string) {
    startTransition(async () => {
      applyMove({ id: dealId, stageId });
      const result = await moveStageAction(dealId, stageId);
      if (result && result.blocked) {
        flash(`${t("blockedBody")} ${(result.missingFields ?? []).join(", ")}`);
      }
      router.refresh();
      if (selectedId === dealId) await reloadDetail(dealId);
    });
  }

  function onChanged() {
    router.refresh();
    if (selectedId) void reloadDetail(selectedId);
  }

  const open = board.deals.filter((d) => d.status === "open");
  const pipelineValue = open.reduce((s, d) => s + (d.estimatedValue ?? 0), 0);
  const quoteReady = open.filter((d) => d.missingCount === 0).length;

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#e6e8ec] bg-white px-5">
        <h1 className="text-[15px] font-bold text-[#1f2430]">
          {t("navPipeline")}
        </h1>
        <div className="ml-2 flex h-9 max-w-sm flex-1 items-center gap-2 rounded-lg border border-[#e6e8ec] bg-[#f6f7f9] px-3 focus-within:border-[#4f46e5]">
          <Search className="size-4 text-[#9aa1ab]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-[#1f2430] outline-none placeholder:text-[#9aa1ab]"
          />
        </div>
        <button
          onClick={() => setNewLeadOpen(true)}
          className="ml-auto flex h-9 items-center gap-1.5 rounded-lg bg-[#4f46e5] px-3.5 text-[13px] font-semibold text-white hover:bg-[#4338ca]"
        >
          <Plus className="size-4" />
          {t("newLead")}
        </button>
      </header>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#e6e8ec] bg-white px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-[#f0f1f4] p-0.5">
            <ViewTab
              active={view === "board"}
              onClick={() => setView("board")}
              icon={<Columns3 className="size-3.5" />}
              label={t("boardView")}
            />
            <ViewTab
              active={view === "table"}
              onClick={() => setView("table")}
              icon={<Table2 className="size-3.5" />}
              label={t("tableView")}
            />
          </div>
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="h-8 rounded-lg border border-[#e6e8ec] bg-white px-2 text-[12.5px] font-medium text-[#4b5563] outline-none focus:border-[#4f46e5]"
          >
            <option value="">{t("allOwners")}</option>
            {board.agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select
            value={lobFilter}
            onChange={(e) => setLobFilter(e.target.value)}
            className="h-8 rounded-lg border border-[#e6e8ec] bg-white px-2 text-[12.5px] font-medium text-[#4b5563] outline-none focus:border-[#4f46e5]"
          >
            <option value="">{t("allTypes")}</option>
            {LOBS.map((lob) => (
              <option key={lob} value={lob}>
                {t(LOB_KEYS[lob])}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2.5">
          <Stat
            icon={<CircleDot className="size-3.5" />}
            label={t("openDeals")}
            value={String(open.length)}
          />
          <Stat
            icon={<TrendingUp className="size-3.5" />}
            label={t("pipelineValue")}
            value={`₾${pipelineValue.toLocaleString("en-US")}`}
          />
          <Stat
            icon={<Sparkles className="size-3.5" />}
            label={t("quoteReady")}
            value={String(quoteReady)}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 bg-[#f6f7f9]">
        {view === "board" ? (
          <PipelineBoard
            stages={board.stages}
            deals={visibleDeals}
            selectedId={selectedId}
            onSelect={openDeal}
            onMove={moveStage}
          />
        ) : (
          <TableView
            stages={board.stages}
            deals={visibleDeals}
            selectedId={selectedId}
            onSelect={openDeal}
            onMove={moveStage}
          />
        )}
      </div>

      {selectedId && (
        <DealPanel
          detail={detail}
          loading={loadingDetail}
          agents={board.agents}
          onClose={() => {
            setSelectedId(null);
            setDetail(null);
          }}
          onMoveStage={(stageId) => detail && moveStage(detail.id, stageId)}
          onChanged={onChanged}
        />
      )}

      <NewLeadDialog
        open={newLeadOpen}
        onClose={() => setNewLeadOpen(false)}
        onCreated={(dealId) => {
          setNewLeadOpen(false);
          router.refresh();
          void openDeal(dealId);
        }}
      />

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-[#1f2430] px-4 py-2.5 text-[13px] font-medium text-white shadow-xl">
          {toast}
        </div>
      )}
    </>
  );
}

function ViewTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-semibold transition ${
        active
          ? "bg-white text-[#1f2430] shadow-sm"
          : "text-[#6b7280] hover:text-[#1f2430]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[#e6e8ec] bg-white px-3 py-1.5">
      <span className="text-[#9aa1ab]">{icon}</span>
      <div>
        <p className="text-[10px] font-medium uppercase leading-tight tracking-wide text-[#9aa1ab]">
          {label}
        </p>
        <p className="text-[13px] font-bold leading-tight text-[#1f2430]">
          {value}
        </p>
      </div>
    </div>
  );
}
