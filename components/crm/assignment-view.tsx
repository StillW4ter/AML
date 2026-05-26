"use client";

/** Manager lead-assignment board — distribute leads across the team. */
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { UsersRound, Shuffle, CircleUser } from "lucide-react";
import { useI18n } from "./i18n";
import { LOB_KEYS } from "@/lib/i18n";
import { money, initials, avatarTint } from "./format";
import type { AssignmentData } from "@/lib/crm/queries";
import { assignOwnerAction, autoSplitAction } from "@/app/crm/actions";

export function AssignmentView({ data }: { data: AssignmentData }) {
  const { t, loc } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();

  const unassigned = data.leads.filter((l) => !l.ownerId).length;

  function assign(dealId: string, ownerId: string) {
    start(async () => {
      await assignOwnerAction(dealId, ownerId);
      router.refresh();
    });
  }

  function autoSplit() {
    start(async () => {
      await autoSplitAction();
      router.refresh();
    });
  }

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#e6e8ec] bg-white px-5">
        <UsersRound className="size-5 text-[#4f46e5]" />
        <div className="flex-1">
          <h1 className="text-[15px] font-bold leading-tight text-[#1f2430]">
            {t("assignTitle")}
          </h1>
          <p className="text-[11px] leading-tight text-[#9aa1ab]">
            {t("assignSubtitle")}
          </p>
        </div>
        <button
          onClick={autoSplit}
          disabled={pending || unassigned === 0}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-[#4f46e5] px-3.5 text-[13px] font-semibold text-white hover:bg-[#4338ca] disabled:opacity-40"
        >
          <Shuffle className="size-4" />
          {t("autoSplit")}
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#f6f7f9] p-5">
        <div className="mx-auto max-w-3xl space-y-4">
          {/* Team workload */}
          <section className="rounded-xl border border-[#e6e8ec] bg-white p-4">
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wide text-[#9aa1ab]">
              {t("agentLoad")}
            </h2>
            <div className="flex flex-wrap gap-2">
              {data.agents.map((a) => {
                const tint = avatarTint(a.name);
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-2 rounded-lg border border-[#e6e8ec] px-2.5 py-1.5"
                  >
                    <span
                      className="grid size-7 place-items-center rounded-full text-[10px] font-bold"
                      style={{ backgroundColor: tint.bg, color: tint.fg }}
                    >
                      {initials(a.name)}
                    </span>
                    <div>
                      <p className="text-[12.5px] font-semibold text-[#1f2430]">
                        {a.name}
                      </p>
                      <p className="text-[10px] text-[#9aa1ab]">
                        {a.openCount} {t("openCount")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Leads */}
          <section>
            <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#9aa1ab]">
              {t("unassignedLeads")} · {data.leads.length}
            </h2>
            {data.leads.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#e6e8ec] bg-white py-10 text-center text-[13px] text-[#9aa1ab]">
                {t("allAssigned")}
              </p>
            ) : (
              <div className="space-y-2">
                {data.leads.map((lead) => {
                  const tint = avatarTint(lead.personName);
                  return (
                    <div
                      key={lead.id}
                      className="flex items-center gap-3 rounded-xl border border-[#e6e8ec] bg-white p-3"
                    >
                      <span
                        className="grid size-9 shrink-0 place-items-center rounded-full text-[11px] font-bold"
                        style={{ backgroundColor: tint.bg, color: tint.fg }}
                      >
                        {initials(lead.personName)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-[#1f2430]">
                          {loc(lead.personName, lead.personNameKa)}
                        </p>
                        <p className="truncate text-[11px] text-[#9aa1ab]">
                          {lead.reference} ·{" "}
                          {t(LOB_KEYS[lead.lineOfBusiness] ?? "lobAuto")}
                          {lead.source ? ` · ${lead.source}` : ""}
                        </p>
                      </div>
                      <span className="hidden text-[12.5px] font-semibold text-[#1f2430] sm:block">
                        {money(lead.estimatedValue, lead.currency)}
                      </span>
                      <div className="relative">
                        <CircleUser className="pointer-events-none absolute left-2 top-2 size-4 text-[#9aa1ab]" />
                        <select
                          value={lead.ownerId ?? ""}
                          disabled={pending}
                          onChange={(e) => assign(lead.id, e.target.value)}
                          className={`h-9 w-44 rounded-lg border bg-white pl-7 pr-2 text-[12.5px] font-medium outline-none focus:border-[#4f46e5] ${
                            lead.ownerId
                              ? "border-[#e6e8ec] text-[#1f2430]"
                              : "border-[#fcd9b6] bg-[#fff7ed] text-[#c2620e]"
                          }`}
                        >
                          <option value="">{t("unassigned")}</option>
                          {data.agents.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
