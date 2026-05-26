"use client";

/** Modal form for creating a new insurance lead. */
import { useState, useTransition } from "react";
import { X, UserPlus } from "lucide-react";
import { useI18n } from "./i18n";
import { LOB_KEYS } from "@/lib/i18n";
import { createLeadAction } from "@/app/crm/actions";

const LOBS = ["auto", "health", "home", "travel", "pet", "commercial"];

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  lineOfBusiness: "auto",
  request: "",
  source: "",
};

export function NewLeadDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (dealId: string) => void;
}) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const set = (key: keyof typeof emptyForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  function submit() {
    if (!form.name.trim()) {
      setError(t("fieldRequired"));
      return;
    }
    setError(null);
    start(async () => {
      const res = await createLeadAction(form);
      if (res.ok && res.dealId) {
        setForm(emptyForm);
        onCreated(res.dealId);
      } else {
        setError(("error" in res && res.error) || "Could not create the lead");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#1f2430]/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#e6e8ec] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#eef0f3] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-[#eef2ff] text-[#4f46e5]">
              <UserPlus className="size-4" />
            </span>
            <h2 className="text-[15px] font-semibold text-[#1f2430]">
              {t("createLeadTitle")}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg text-[#9aa1ab] hover:bg-[#f3f4f6]"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3.5 px-5 py-5">
          <Field label={t("name")}>
            <input
              autoFocus
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Nino Mchedlidze"
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("phone")}>
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="599 12 34 56"
                className={inputClass}
              />
            </Field>
            <Field label={t("email")}>
              <input
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="nino@email.com"
                className={inputClass}
              />
            </Field>
          </div>
          <Field label={t("lineOfBusiness")}>
            <select
              value={form.lineOfBusiness}
              onChange={(e) => set("lineOfBusiness", e.target.value)}
              className={inputClass}
            >
              {LOBS.map((lob) => (
                <option key={lob} value={lob}>
                  {t(LOB_KEYS[lob])}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("request")}>
            <input
              value={form.request}
              onChange={(e) => set("request", e.target.value)}
              placeholder="Car insurance"
              className={inputClass}
            />
          </Field>
          <Field label={t("source")}>
            <input
              value={form.source}
              onChange={(e) => set("source", e.target.value)}
              placeholder="Website, referral, Google Ads…"
              className={inputClass}
            />
          </Field>

          {error && (
            <p className="rounded-lg bg-[#fef2f2] px-3 py-2 text-xs font-medium text-[#b91c1c]">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#eef0f3] bg-[#fafbfc] px-5 py-3.5">
          <button
            onClick={onClose}
            className="h-9 rounded-lg border border-[#e6e8ec] bg-white px-3.5 text-[13px] font-medium text-[#4b5563] hover:bg-[#f3f4f6]"
          >
            {t("cancel")}
          </button>
          <button
            onClick={submit}
            disabled={pending}
            className="h-9 rounded-lg bg-[#4f46e5] px-4 text-[13px] font-semibold text-white hover:bg-[#4338ca] disabled:opacity-60"
          >
            {pending ? t("creating") : t("createLead")}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "h-9 w-full rounded-lg border border-[#e6e8ec] bg-white px-3 text-[13px] text-[#1f2430] outline-none transition focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/15";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#9aa1ab]">
        {label}
      </span>
      {children}
    </label>
  );
}
