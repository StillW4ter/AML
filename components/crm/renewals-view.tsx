"use client";

/** Renewals — policies coming up for renewal, flagged against the schedule. */
import {
  CalendarClock,
  BellRing,
  Car,
  HeartPulse,
  Home,
  Plane,
  PawPrint,
  Building2,
} from "lucide-react";
import { useI18n } from "./i18n";
import { LOB_KEYS } from "@/lib/i18n";
import { initials, avatarTint } from "./format";
import type { RenewalDTO } from "@/lib/crm/queries";

const LOB_ICON: Record<string, typeof Car> = {
  auto: Car,
  health: HeartPulse,
  home: Home,
  travel: Plane,
  pet: PawPrint,
  commercial: Building2,
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function RenewalsView({ renewals }: { renewals: RenewalDTO[] }) {
  const { t, loc } = useI18n();
  const dueCount = renewals.filter((r) => r.due || r.expired).length;

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#e6e8ec] bg-white px-5">
        <CalendarClock className="size-5 text-[#4f46e5]" />
        <div className="flex-1">
          <h1 className="text-[15px] font-bold leading-tight text-[#1f2430]">
            {t("renewalsTitle")}
          </h1>
          <p className="text-[11px] leading-tight text-[#9aa1ab]">
            {t("renewalsSubtitle")}
          </p>
        </div>
        {dueCount > 0 && (
          <span className="flex items-center gap-1.5 rounded-lg bg-[#fff7ed] px-3 py-1.5 text-[12.5px] font-semibold text-[#c2620e]">
            <BellRing className="size-3.5" />
            {dueCount} {t("dueNow").toLowerCase()}
          </span>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#f6f7f9] p-5">
        <div className="mx-auto max-w-3xl">
          {renewals.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#e6e8ec] bg-white py-12 text-center text-[13px] text-[#9aa1ab]">
              {t("noRenewals")}
            </p>
          ) : (
            <div className="space-y-2">
              {renewals.map((r) => {
                const Icon = LOB_ICON[r.lineOfBusiness] ?? Car;
                const tint = avatarTint(r.personName);
                const flag = r.expired
                  ? { label: t("expired"), cls: "bg-[#fef2f2] text-[#b91c1c]" }
                  : r.due
                    ? { label: t("dueNow"), cls: "bg-[#fff7ed] text-[#c2620e]" }
                    : {
                        label: `${r.daysUntil} ${t("daysLeft")}`,
                        cls: "bg-[#f0f1f4] text-[#6b7280]",
                      };
                return (
                  <div
                    key={r.dealId}
                    className={`flex items-center gap-3 rounded-xl border bg-white p-3 ${
                      r.expired
                        ? "border-[#fee2e2]"
                        : r.due
                          ? "border-[#fcd9b6]"
                          : "border-[#e6e8ec]"
                    }`}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#f0f1f4] text-[#6b7280]">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-[#1f2430]">
                        {loc(r.personName, r.personNameKa)}
                      </p>
                      <p className="truncate text-[11px] text-[#9aa1ab]">
                        {r.reference} ·{" "}
                        {t(LOB_KEYS[r.lineOfBusiness] ?? "lobAuto")}
                        {r.insurer ? ` · ${r.insurer}` : ""}
                      </p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <p className="text-[11px] text-[#9aa1ab]">
                        {t("expiresLabel")}
                      </p>
                      <p className="text-[12.5px] font-semibold text-[#1f2430]">
                        {formatDate(r.policyExpiry)}
                      </p>
                    </div>
                    <span
                      className={`rounded-md px-2 py-1 text-[11px] font-bold ${flag.cls}`}
                    >
                      {flag.label}
                    </span>
                    <div className="hidden w-24 items-center gap-1.5 sm:flex">
                      {r.ownerName ? (
                        <>
                          <span
                            className="grid size-6 place-items-center rounded-full text-[9px] font-bold"
                            style={{
                              backgroundColor: avatarTint(r.ownerName).bg,
                              color: avatarTint(r.ownerName).fg,
                            }}
                          >
                            {initials(r.ownerName)}
                          </span>
                          <span className="truncate text-[11px] text-[#6b7280]">
                            {r.ownerName}
                          </span>
                        </>
                      ) : (
                        <span className="text-[11px] text-[#9aa1ab]">
                          {t("unassigned")}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
