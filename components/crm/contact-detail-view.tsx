"use client";

/** Contact-as-hub — a person and all of their insurances. */
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Car,
  HeartPulse,
  Home,
  Plane,
  PawPrint,
  Building2,
  CalendarClock,
} from "lucide-react";
import { useI18n } from "./i18n";
import { LOB_KEYS } from "@/lib/i18n";
import { money, initials, avatarTint, relativeTime } from "./format";
import type { ContactDetailDTO } from "@/lib/crm/queries";
import { addInsuranceAction } from "@/app/crm/actions";

const LOB_ICON: Record<string, typeof Car> = {
  auto: Car,
  health: HeartPulse,
  home: Home,
  travel: Plane,
  pet: PawPrint,
  commercial: Building2,
};
const LOBS = ["auto", "health", "home", "travel", "pet", "commercial"];

export function ContactDetailView({ contact }: { contact: ContactDetailDTO }) {
  const { t, loc } = useI18n();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [lob, setLob] = useState("auto");
  const [request, setRequest] = useState("");
  const [pending, start] = useTransition();

  const tint = avatarTint(contact.name);
  const totalValue = contact.deals.reduce(
    (s, d) => s + (d.estimatedValue ?? 0),
    0,
  );

  function add() {
    start(async () => {
      const res = await addInsuranceAction(contact.id, lob, request);
      if (res.ok) {
        setAdding(false);
        setRequest("");
        setLob("auto");
        router.refresh();
      }
    });
  }

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#e6e8ec] bg-white px-5">
        <Link
          href="/crm/contacts"
          className="grid size-8 place-items-center rounded-lg text-[#9aa1ab] hover:bg-[#f3f4f6]"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-[15px] font-bold text-[#1f2430]">
          {t("contactsTitle")}
        </h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#f6f7f9] p-5">
        <div className="mx-auto max-w-3xl space-y-5">
          {/* Contact card */}
          <section className="rounded-xl border border-[#e6e8ec] bg-white p-5">
            <div className="flex items-start gap-4">
              <span
                className="grid size-14 shrink-0 place-items-center rounded-full text-[18px] font-bold"
                style={{ backgroundColor: tint.bg, color: tint.fg }}
              >
                {initials(contact.name)}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[18px] font-bold text-[#1f2430]">
                  {loc(contact.name, contact.nameKa)}
                </h2>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[#6b7280]">
                  {contact.phone && <span>{contact.phone}</span>}
                  {contact.email && <span>{contact.email}</span>}
                  {(contact.city || contact.cityKa) && (
                    <span>{loc(contact.city, contact.cityKa)}</span>
                  )}
                  {contact.source && (
                    <span className="rounded border border-[#e6e8ec] px-1.5 text-[11px] text-[#9aa1ab]">
                      {contact.source}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#9aa1ab]">
                  {contact.deals.length} {t("insurances").toLowerCase()}
                </p>
                <p className="text-[18px] font-bold text-[#1f2430]">
                  {money(totalValue)}
                </p>
              </div>
            </div>
          </section>

          {/* Insurances */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#9aa1ab]">
                {t("insurances")}
              </h3>
              <button
                onClick={() => setAdding((v) => !v)}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-[#4f46e5] px-3 text-[12.5px] font-semibold text-white hover:bg-[#4338ca]"
              >
                <Plus className="size-4" />
                {t("addInsurance")}
              </button>
            </div>

            {adding && (
              <div className="mb-3 rounded-xl border border-[#e6e8ec] bg-white p-3">
                <p className="mb-2 text-[12px] font-semibold text-[#6b7280]">
                  {t("newInsuranceFor")}
                </p>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={lob}
                    onChange={(e) => setLob(e.target.value)}
                    className="h-9 rounded-lg border border-[#e6e8ec] bg-white px-2 text-[13px] outline-none focus:border-[#4f46e5]"
                  >
                    {LOBS.map((l) => (
                      <option key={l} value={l}>
                        {t(LOB_KEYS[l])}
                      </option>
                    ))}
                  </select>
                  <input
                    value={request}
                    onChange={(e) => setRequest(e.target.value)}
                    placeholder={t("request")}
                    className="h-9 flex-1 rounded-lg border border-[#e6e8ec] bg-white px-3 text-[13px] outline-none focus:border-[#4f46e5]"
                  />
                  <button
                    onClick={add}
                    disabled={pending}
                    className="h-9 rounded-lg bg-[#4f46e5] px-4 text-[13px] font-semibold text-white hover:bg-[#4338ca] disabled:opacity-50"
                  >
                    {pending ? t("creating") : t("createLead")}
                  </button>
                </div>
              </div>
            )}

            {contact.deals.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#e6e8ec] bg-white py-10 text-center text-[13px] text-[#9aa1ab]">
                {t("noInsurances")}
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {contact.deals.map((deal) => {
                  const Icon = LOB_ICON[deal.lineOfBusiness] ?? Car;
                  const statusTone =
                    deal.status === "won"
                      ? "bg-[#ecfdf5] text-[#047857]"
                      : deal.status === "lost"
                        ? "bg-[#fef2f2] text-[#b91c1c]"
                        : "bg-[#eef2ff] text-[#4f46e5]";
                  return (
                    <div
                      key={deal.id}
                      className="rounded-xl border border-[#e6e8ec] bg-white p-3.5"
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="grid size-8 place-items-center rounded-lg bg-[#f0f1f4] text-[#6b7280]">
                            <Icon className="size-4" />
                          </span>
                          <div>
                            <p className="text-[13px] font-semibold text-[#1f2430]">
                              {t(LOB_KEYS[deal.lineOfBusiness] ?? "lobAuto")}
                            </p>
                            <p className="text-[11px] text-[#9aa1ab]">
                              {deal.reference}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${statusTone}`}
                        >
                          {deal.status}
                        </span>
                      </div>
                      <p className="mb-2 text-[12.5px] text-[#4b5563]">
                        {deal.request || deal.title}
                      </p>
                      <div className="flex items-center justify-between border-t border-[#f1f2f4] pt-2 text-[12px]">
                        <span className="font-semibold text-[#1f2430]">
                          {money(deal.estimatedValue, deal.currency)}
                        </span>
                        <span className="text-[#6b7280]">
                          {loc(deal.stageName, deal.stageNameKa)}
                        </span>
                      </div>
                      {deal.policyExpiry && (
                        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-[#9aa1ab]">
                          <CalendarClock className="size-3" />
                          {t("expiresLabel")}:{" "}
                          {new Date(deal.policyExpiry).toLocaleDateString(
                            "en-GB",
                            { day: "numeric", month: "short", year: "numeric" },
                          )}
                        </p>
                      )}
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
