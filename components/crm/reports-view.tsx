"use client";

/** Reports dashboard — pipeline health and team performance. */
import {
  TrendingUp,
  Trophy,
  Percent,
  Clock,
  BarChart3,
} from "lucide-react";
import { useI18n } from "./i18n";
import { LOB_KEYS } from "@/lib/i18n";
import { money, initials, avatarTint } from "./format";
import type { ReportsData } from "@/lib/crm/queries";

export function ReportsView({ data }: { data: ReportsData }) {
  const { t, loc } = useI18n();
  const maxFunnel = Math.max(1, ...data.funnel.map((f) => f.count));
  const maxLob = Math.max(1, ...data.byLob.map((l) => l.value));
  const maxAgent = Math.max(1, ...data.byAgent.map((a) => a.won + a.open));

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#e6e8ec] bg-white px-5">
        <BarChart3 className="size-5 text-[#4f46e5]" />
        <div>
          <h1 className="text-[15px] font-bold leading-tight text-[#1f2430]">
            {t("reportsTitle")}
          </h1>
          <p className="text-[11px] leading-tight text-[#9aa1ab]">
            {t("reportsSubtitle")}
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#f6f7f9] p-5">
        <div className="mx-auto max-w-5xl space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi
              icon={<TrendingUp className="size-4" />}
              label={t("totalPipeline")}
              value={money(data.openValue)}
              sub={`${data.openCount} ${t("dealsLabel").toLowerCase()}`}
            />
            <Kpi
              icon={<Trophy className="size-4" />}
              label={t("wonValueLabel")}
              value={money(data.wonValue)}
              sub={`${data.wonCount} ${t("wonLabel").toLowerCase()}`}
              tone="emerald"
            />
            <Kpi
              icon={<Percent className="size-4" />}
              label={t("winRate")}
              value={`${data.winRate}%`}
              sub={`${data.wonCount}/${data.wonCount + data.lostCount}`}
            />
            <Kpi
              icon={<Clock className="size-4" />}
              label={t("avgDealAge")}
              value={`${data.avgAgeDays}`}
              sub={t("days")}
            />
          </div>

          {/* Funnel */}
          <Card title={t("conversionFunnel")}>
            <div className="space-y-2.5">
              {data.funnel.map((stage) => {
                const tone =
                  stage.type === "won"
                    ? "#10b981"
                    : stage.type === "lost"
                      ? "#f43f5e"
                      : "#6366f1";
                return (
                  <div key={stage.stageId} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 truncate text-[12.5px] font-medium text-[#4b5563]">
                      {loc(stage.name, stage.nameKa)}
                    </span>
                    <div className="h-7 flex-1 overflow-hidden rounded-md bg-[#f0f1f4]">
                      <div
                        className="flex h-full items-center rounded-md px-2 text-[11px] font-bold text-white"
                        style={{
                          width: `${Math.max(8, (stage.count / maxFunnel) * 100)}%`,
                          backgroundColor: tone,
                        }}
                      >
                        {stage.count}
                      </div>
                    </div>
                    <span className="w-20 shrink-0 text-right text-[12px] font-semibold text-[#1f2430]">
                      {money(stage.value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Per agent */}
            <Card title={t("perAgent")}>
              <div className="space-y-3">
                {data.byAgent.map((a) => {
                  const tint = avatarTint(a.name);
                  return (
                    <div key={a.id} className="flex items-center gap-3">
                      <span
                        className="grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-bold"
                        style={{ backgroundColor: tint.bg, color: tint.fg }}
                      >
                        {initials(a.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="truncate text-[13px] font-semibold text-[#1f2430]">
                            {a.name}
                          </span>
                          <span className="text-[12px] font-semibold text-[#1f2430]">
                            {money(a.wonValue)}
                          </span>
                        </div>
                        <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-[#f0f1f4]">
                          <div
                            className="bg-[#10b981]"
                            style={{ width: `${(a.won / maxAgent) * 100}%` }}
                          />
                          <div
                            className="bg-[#c7cbff]"
                            style={{ width: `${(a.open / maxAgent) * 100}%` }}
                          />
                        </div>
                        <p className="mt-0.5 text-[11px] text-[#9aa1ab]">
                          {a.won} {t("wonLabel").toLowerCase()} · {a.open}{" "}
                          {t("openLabel").toLowerCase()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* By line of business */}
            <Card title={t("byLine")}>
              <div className="space-y-2.5">
                {data.byLob.map((l) => (
                  <div key={l.lob} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-[12.5px] font-medium text-[#4b5563]">
                      {t(LOB_KEYS[l.lob] ?? "lobAuto")}
                    </span>
                    <div className="h-5 flex-1 overflow-hidden rounded-md bg-[#f0f1f4]">
                      <div
                        className="h-full rounded-md bg-[#6366f1]"
                        style={{
                          width: `${Math.max(6, (l.value / maxLob) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="w-12 shrink-0 text-right text-[12px] font-semibold text-[#1f2430]">
                      {l.count}
                    </span>
                    <span className="w-20 shrink-0 text-right text-[12px] text-[#6b7280]">
                      {money(l.value)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

function Kpi({
  icon,
  label,
  value,
  sub,
  tone = "indigo",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone?: "indigo" | "emerald";
}) {
  const tint =
    tone === "emerald"
      ? { bg: "#ecfdf5", fg: "#047857" }
      : { bg: "#eef2ff", fg: "#4f46e5" };
  return (
    <div className="rounded-xl border border-[#e6e8ec] bg-white p-4">
      <span
        className="mb-2 inline-grid size-8 place-items-center rounded-lg"
        style={{ backgroundColor: tint.bg, color: tint.fg }}
      >
        {icon}
      </span>
      <p className="text-[11px] font-medium uppercase tracking-wide text-[#9aa1ab]">
        {label}
      </p>
      <p className="text-[22px] font-bold leading-tight text-[#1f2430]">
        {value}
      </p>
      <p className="text-[11px] text-[#9aa1ab]">{sub}</p>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#e6e8ec] bg-white p-4">
      <h2 className="mb-3.5 text-[11px] font-bold uppercase tracking-wide text-[#9aa1ab]">
        {title}
      </h2>
      {children}
    </section>
  );
}
