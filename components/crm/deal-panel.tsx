"use client";

/** The deal record panel — overview, insurance, activity, messaging. */
import { useMemo, useState, useTransition } from "react";
import {
  X,
  Phone,
  Mail,
  MessageCircle,
  Send,
  Check,
  Sparkles,
  Plus,
  ChevronDown,
  Pencil,
  Trophy,
  XCircle,
} from "lucide-react";
import { useI18n } from "./i18n";
import { LOB_KEYS } from "@/lib/i18n";
import { money, initials, avatarTint, relativeTime, clockTime } from "./format";
import type { AgentDTO, DealDetailDTO, StageDTO } from "@/lib/crm/queries";
import type { ResolvedField } from "@/lib/crm/field-definitions";
import {
  updateFieldAction,
  updatePolicyAction,
  updateDealAction,
  closeDealAction,
  addQuoteAction,
  logActivityAction,
  sendMessageAction,
  assignOwnerAction,
} from "@/app/crm/actions";

type Tab = "overview" | "insurance" | "activity" | "messaging";

export function DealPanel({
  detail,
  loading,
  agents,
  onClose,
  onMoveStage,
  onChanged,
}: {
  detail: DealDetailDTO | null;
  loading: boolean;
  agents: AgentDTO[];
  onClose: () => void;
  onMoveStage: (stageId: string) => void;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("overview");
  const [closing, setClosing] = useState<StageDTO | null>(null);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="flex-1 bg-[#1f2430]/30" onClick={onClose} />
      <aside className="flex w-full max-w-[480px] flex-col border-l border-[#e6e8ec] bg-white shadow-2xl">
        {loading || !detail ? (
          <div className="grid flex-1 place-items-center text-[13px] text-[#9aa1ab]">
            {t("loading")}
          </div>
        ) : (
          <>
            <PanelHeader detail={detail} onClose={onClose} />
            <StageStepper
              detail={detail}
              onPick={(stage) => {
                if (stage.type === "open") onMoveStage(stage.id);
                else setClosing(stage);
              }}
            />
            {closing && (
              <CloseDealForm
                detail={detail}
                stage={closing}
                onCancel={() => setClosing(null)}
                onDone={() => {
                  setClosing(null);
                  onChanged();
                }}
              />
            )}
            <nav className="flex gap-1 border-b border-[#eef0f3] px-3">
              {(
                [
                  ["overview", t("overview")],
                  ["insurance", t("insurance")],
                  ["activity", t("activityTab")],
                  ["messaging", t("messaging")],
                ] as [Tab, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`-mb-px border-b-2 px-2.5 py-2.5 text-[12.5px] font-semibold transition ${
                    tab === id
                      ? "border-[#4f46e5] text-[#4f46e5]"
                      : "border-transparent text-[#9aa1ab] hover:text-[#4b5563]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {tab === "overview" && (
                <OverviewTab
                  key={detail.id}
                  detail={detail}
                  agents={agents}
                  onChanged={onChanged}
                />
              )}
              {tab === "insurance" && (
                <InsuranceTab key={detail.id} detail={detail} onChanged={onChanged} />
              )}
              {tab === "activity" && (
                <ActivityTab detail={detail} onChanged={onChanged} />
              )}
              {tab === "messaging" && (
                <MessagingTab detail={detail} onChanged={onChanged} />
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

// --- Header + stage stepper -------------------------------------------------

function PanelHeader({
  detail,
  onClose,
}: {
  detail: DealDetailDTO;
  onClose: () => void;
}) {
  const { loc } = useI18n();
  const tint = avatarTint(detail.person.name);
  return (
    <header className="flex items-start gap-3 border-b border-[#eef0f3] px-4 py-3.5">
      <span
        className="grid size-10 shrink-0 place-items-center rounded-full text-[13px] font-bold"
        style={{ backgroundColor: tint.bg, color: tint.fg }}
      >
        {initials(detail.person.name)}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[15px] font-semibold text-[#1f2430]">
          {loc(detail.person.name, detail.person.nameKa)}
        </h2>
        <p className="truncate text-[12px] text-[#9aa1ab]">
          {detail.reference} ·{" "}
          {loc(detail.request, detail.requestKa) || detail.lineOfBusiness}
        </p>
      </div>
      <button
        onClick={onClose}
        className="grid size-8 shrink-0 place-items-center rounded-lg text-[#9aa1ab] hover:bg-[#f3f4f6]"
      >
        <X className="size-4" />
      </button>
    </header>
  );
}

function StageStepper({
  detail,
  onPick,
}: {
  detail: DealDetailDTO;
  onPick: (stage: StageDTO) => void;
}) {
  const { loc } = useI18n();
  const open = detail.stages.filter((s) => s.type === "open");
  const currentIdx = open.findIndex((s) => s.id === detail.stageId);
  const current = detail.stages.find((s) => s.id === detail.stageId);

  return (
    <div className="border-b border-[#eef0f3] px-4 py-3">
      <div className="mb-2 flex gap-1">
        {open.map((s, i) => (
          <span
            key={s.id}
            title={loc(s.name, s.nameKa)}
            className={`h-1.5 flex-1 rounded-full ${
              i <= currentIdx ? "bg-[#4f46e5]" : "bg-[#e6e8ec]"
            }`}
          />
        ))}
      </div>
      <div className="relative">
        <select
          value={detail.stageId}
          onChange={(e) => {
            const stage = detail.stages.find((s) => s.id === e.target.value);
            if (stage) onPick(stage);
          }}
          className="h-9 w-full appearance-none rounded-lg border border-[#e6e8ec] bg-white pl-3 pr-8 text-[13px] font-medium text-[#1f2430] outline-none focus:border-[#4f46e5]"
        >
          {detail.stages.map((s) => (
            <option key={s.id} value={s.id}>
              {loc(s.name, s.nameKa)}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 size-4 text-[#9aa1ab]" />
        {current && current.type !== "open" && (
          <span
            className={`absolute right-9 top-2 rounded-md px-1.5 py-1 text-[10px] font-bold uppercase ${
              current.type === "won"
                ? "bg-[#ecfdf5] text-[#047857]"
                : "bg-[#fef2f2] text-[#b91c1c]"
            }`}
          >
            {current.type}
          </span>
        )}
      </div>
    </div>
  );
}

function CloseDealForm({
  detail,
  stage,
  onCancel,
  onDone,
}: {
  detail: DealDetailDTO;
  stage: StageDTO;
  onCancel: () => void;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const won = stage.type === "won";
  const [closeValue, setCloseValue] = useState(
    detail.estimatedValue != null ? String(detail.estimatedValue) : "",
  );
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  function confirm() {
    start(async () => {
      await closeDealAction(detail.id, stage.id, {
        closeValue: won ? Number(closeValue) || undefined : undefined,
        lossReason: won ? undefined : reason,
      });
      onDone();
    });
  }

  return (
    <div
      className={`border-b px-4 py-3 ${
        won ? "border-[#d1fae5] bg-[#ecfdf5]" : "border-[#fee2e2] bg-[#fef2f2]"
      }`}
    >
      <div
        className={`mb-2 flex items-center gap-1.5 text-[12px] font-bold ${
          won ? "text-[#047857]" : "text-[#b91c1c]"
        }`}
      >
        {won ? <Trophy className="size-3.5" /> : <XCircle className="size-3.5" />}
        {won ? t("confirmWon") : t("confirmLost")}
      </div>
      {won ? (
        <input
          value={closeValue}
          onChange={(e) => setCloseValue(e.target.value)}
          placeholder={t("closeValue")}
          inputMode="numeric"
          className="mb-2 h-8 w-full rounded-lg border border-[#d1fae5] bg-white px-2.5 text-[13px] outline-none focus:border-[#10b981]"
        />
      ) : (
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("lossReason")}
          className="mb-2 h-8 w-full rounded-lg border border-[#fee2e2] bg-white px-2.5 text-[13px] outline-none focus:border-[#f43f5e]"
        />
      )}
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="h-8 rounded-lg border border-[#e6e8ec] bg-white px-3 text-[12px] font-medium text-[#4b5563]"
        >
          {t("cancel")}
        </button>
        <button
          onClick={confirm}
          disabled={pending}
          className={`h-8 rounded-lg px-3 text-[12px] font-semibold text-white disabled:opacity-50 ${
            won ? "bg-[#10b981]" : "bg-[#f43f5e]"
          }`}
        >
          {t("confirm")}
        </button>
      </div>
    </div>
  );
}

// --- Overview tab -----------------------------------------------------------

function OverviewTab({
  detail,
  agents,
  onChanged,
}: {
  detail: DealDetailDTO;
  agents: AgentDTO[];
  onChanged: () => void;
}) {
  const { t, loc } = useI18n();
  const [pending, start] = useTransition();
  const p = detail.person;

  return (
    <div className="space-y-5 p-4">
      <Section title={t("contactDetails")}>
        <Row label={t("name")} value={loc(p.name, p.nameKa)} />
        <Row label={t("phone")} value={p.phone ?? "—"} />
        <Row label={t("email")} value={p.email ?? "—"} />
        <Row label={t("city")} value={loc(p.city, p.cityKa) || "—"} />
      </Section>

      <EditableDealDetails detail={detail} onChanged={onChanged} />

      <Section title={t("owner")}>
        <select
          value={detail.owner?.id ?? ""}
          disabled={pending}
          onChange={(e) =>
            start(async () => {
              await assignOwnerAction(detail.id, e.target.value);
              onChanged();
            })
          }
          className="h-9 w-full rounded-lg border border-[#e6e8ec] bg-white px-3 text-[13px] text-[#1f2430] outline-none focus:border-[#4f46e5]"
        >
          <option value="">{t("unassigned")}</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} · {loc(a.role, a.roleKa)}
            </option>
          ))}
        </select>
      </Section>

      <QuotesSection detail={detail} onChanged={onChanged} />
    </div>
  );
}

function EditableDealDetails({
  detail,
  onChanged,
}: {
  detail: DealDetailDTO;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(detail.title);
  const [request, setRequest] = useState(detail.request ?? "");
  const [value, setValue] = useState(
    detail.estimatedValue != null ? String(detail.estimatedValue) : "",
  );
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      await updateDealAction(detail.id, {
        title: title.trim() || undefined,
        request,
        estimatedValue: value.trim() ? Number(value) : undefined,
      });
      setEditing(false);
      onChanged();
    });
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#9aa1ab]">
          {t("dealDetails")}
        </h3>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#4f46e5] hover:underline"
          >
            <Pencil className="size-3" />
            {t("edit")}
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2 rounded-lg border border-[#e6e8ec] p-3">
          <EditField label={t("dealTitle")}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={panelInput}
            />
          </EditField>
          <EditField label={t("request")}>
            <input
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              className={panelInput}
            />
          </EditField>
          <EditField label={t("value")}>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              inputMode="numeric"
              className={panelInput}
            />
          </EditField>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => {
                setEditing(false);
                setTitle(detail.title);
                setRequest(detail.request ?? "");
                setValue(
                  detail.estimatedValue != null
                    ? String(detail.estimatedValue)
                    : "",
                );
              }}
              className="h-7 rounded-md border border-[#e6e8ec] px-2.5 text-[12px] font-medium text-[#4b5563]"
            >
              {t("cancel")}
            </button>
            <button
              onClick={save}
              disabled={pending}
              className="h-7 rounded-md bg-[#4f46e5] px-2.5 text-[12px] font-semibold text-white disabled:opacity-50"
            >
              {pending ? t("saving") : t("save")}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <Row label={t("dealTitle")} value={detail.title} />
          <Row
            label={t("lineOfBusiness")}
            value={t(LOB_KEYS[detail.lineOfBusiness] ?? "lobAuto")}
          />
          <Row label={t("request")} value={detail.request || "—"} />
          <Row label={t("source")} value={detail.source ?? "—"} />
          <Row
            label={t("value")}
            value={money(detail.estimatedValue, detail.currency)}
          />
        </div>
      )}
    </div>
  );
}

function QuotesSection({
  detail,
  onChanged,
}: {
  detail: DealDetailDTO;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const [insurer, setInsurer] = useState("");
  const [premium, setPremium] = useState("");
  const [pending, start] = useTransition();

  function add() {
    if (!insurer.trim() || !(Number(premium) > 0)) return;
    start(async () => {
      await addQuoteAction(detail.id, {
        insurer,
        premium: Number(premium),
      });
      setInsurer("");
      setPremium("");
      onChanged();
    });
  }

  return (
    <Section title={t("quotes")}>
      <div className="space-y-1.5">
        {detail.quotes.map((q) => (
          <div
            key={q.id}
            className="flex items-center justify-between rounded-lg border border-[#e6e8ec] px-3 py-2 text-[13px]"
          >
            <span className="font-medium text-[#1f2430]">{q.insurer}</span>
            <span className="font-semibold text-[#1f2430]">
              {money(q.premium, q.currency)}
            </span>
          </div>
        ))}
        <div className="flex gap-1.5">
          <input
            value={insurer}
            onChange={(e) => setInsurer(e.target.value)}
            placeholder={t("insurer")}
            className="h-8 flex-1 rounded-lg border border-[#e6e8ec] bg-white px-2.5 text-[12.5px] outline-none focus:border-[#4f46e5]"
          />
          <input
            value={premium}
            onChange={(e) => setPremium(e.target.value)}
            placeholder={t("premium")}
            inputMode="numeric"
            className="h-8 w-20 rounded-lg border border-[#e6e8ec] bg-white px-2.5 text-[12.5px] outline-none focus:border-[#4f46e5]"
          />
          <button
            onClick={add}
            disabled={pending || !insurer.trim() || !(Number(premium) > 0)}
            className="flex h-8 items-center gap-1 rounded-lg bg-[#4f46e5] px-2.5 text-[12px] font-semibold text-white disabled:opacity-40"
          >
            <Plus className="size-3.5" />
            {t("addQuote")}
          </button>
        </div>
      </div>
    </Section>
  );
}

// --- Insurance tab ----------------------------------------------------------

function InsuranceTab({
  detail,
  onChanged,
}: {
  detail: DealDetailDTO;
  onChanged: () => void;
}) {
  const { t, lang } = useI18n();
  const [fields, setFields] = useState<ResolvedField[]>(detail.fields);
  const [pending, start] = useTransition();
  const dirty = useMemo(
    () => fields.some((f, i) => f.value !== (detail.fields[i]?.value ?? "")),
    [fields, detail.fields],
  );

  function save() {
    start(async () => {
      for (let i = 0; i < fields.length; i++) {
        if (fields[i].value !== (detail.fields[i]?.value ?? "")) {
          await updateFieldAction(detail.id, fields[i].key, fields[i].value);
        }
      }
      onChanged();
    });
  }

  return (
    <div className="space-y-4 p-4">
      <PolicySection detail={detail} onChanged={onChanged} />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#9aa1ab]">
            {t("underwriting")}
          </h3>
          <button
            onClick={save}
            disabled={!dirty || pending}
            className="flex h-7 items-center gap-1 rounded-md bg-[#4f46e5] px-2.5 text-[12px] font-semibold text-white transition hover:bg-[#4338ca] disabled:opacity-40"
          >
            <Check className="size-3.5" />
            {pending ? t("saving") : t("save")}
          </button>
        </div>

        {fields.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#e6e8ec] py-6 text-center text-[12px] text-[#9aa1ab]">
            {t("empty")}
          </p>
        ) : (
          <div className="divide-y divide-[#f1f2f4] overflow-hidden rounded-xl border border-[#e6e8ec]">
            {fields.map((field, idx) => (
              <div key={field.key} className="px-3 py-2.5">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-[12px] font-medium text-[#6b7280]">
                    {(lang === "ka" && field.labelKa) || field.labelEn}
                    {field.required && (
                      <span className="ml-1 text-[#f43f5e]">*</span>
                    )}
                  </span>
                  <div className="flex items-center gap-1">
                    {field.shared && (
                      <span className="rounded bg-[#f0f1f4] px-1.5 py-0.5 text-[10px] font-semibold text-[#9aa1ab]">
                        {t("sharedScope")}
                      </span>
                    )}
                    {field.source === "ai" && (
                      <span className="flex items-center gap-0.5 rounded bg-[#eef2ff] px-1.5 py-0.5 text-[10px] font-semibold text-[#4f46e5]">
                        <Sparkles className="size-2.5" />
                        {t("aiSuggested")}
                      </span>
                    )}
                  </div>
                </div>
                <FieldInput
                  field={field}
                  onChange={(v) =>
                    setFields((prev) =>
                      prev.map((f, i) => (i === idx ? { ...f, value: v } : f)),
                    )
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const fieldInputClass =
  "h-8 w-full rounded-md border border-transparent bg-[#f6f7f9] px-2 text-[13px] text-[#1f2430] outline-none transition focus:border-[#4f46e5] focus:bg-white";

function FieldInput({
  field,
  onChange,
}: {
  field: ResolvedField;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();

  if (field.type === "select" && field.options && field.options.length) {
    return (
      <select
        value={field.value}
        onChange={(e) => onChange(e.target.value)}
        className={fieldInputClass}
      >
        <option value="">—</option>
        {field.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "boolean") {
    return (
      <select
        value={field.value}
        onChange={(e) => onChange(e.target.value)}
        className={fieldInputClass}
      >
        <option value="">—</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    );
  }
  return (
    <input
      type={field.type === "date" ? "date" : "text"}
      inputMode={field.type === "number" ? "numeric" : undefined}
      value={field.value}
      placeholder={t("empty")}
      onChange={(e) => onChange(e.target.value)}
      className={fieldInputClass}
    />
  );
}

function PolicySection({
  detail,
  onChanged,
}: {
  detail: DealDetailDTO;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const p = detail.policy;
  const startInit = p.policyStart ? p.policyStart.slice(0, 10) : "";
  const expiryInit = p.renewalDate ? p.renewalDate.slice(0, 16) : "";

  const [insurer, setInsurer] = useState(p.insurer ?? "");
  const [policyNumber, setPolicyNumber] = useState(p.policyNumber ?? "");
  const [policyStart, setPolicyStart] = useState(startInit);
  const [expiry, setExpiry] = useState(expiryInit);

  const dirty =
    insurer !== (p.insurer ?? "") ||
    policyNumber !== (p.policyNumber ?? "") ||
    policyStart !== startInit ||
    expiry !== expiryInit;

  function save() {
    start(async () => {
      await updatePolicyAction(detail.id, {
        insurer,
        policyNumber,
        policyStart,
        renewalDate: expiry,
      });
      onChanged();
    });
  }

  return (
    <div className="rounded-xl border border-[#e6e8ec] bg-[#fafbfc] p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#9aa1ab]">
          {t("policy")}
        </h3>
        <button
          onClick={save}
          disabled={!dirty || pending}
          className="flex h-7 items-center gap-1 rounded-md bg-[#4f46e5] px-2.5 text-[12px] font-semibold text-white transition hover:bg-[#4338ca] disabled:opacity-40"
        >
          <Check className="size-3.5" />
          {pending ? t("saving") : t("save")}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <PolicyField label={t("insurer")}>
          <input
            value={insurer}
            onChange={(e) => setInsurer(e.target.value)}
            className={fieldInputClass}
          />
        </PolicyField>
        <PolicyField label={t("policyNumber")}>
          <input
            value={policyNumber}
            onChange={(e) => setPolicyNumber(e.target.value)}
            className={fieldInputClass}
          />
        </PolicyField>
        <PolicyField label={t("policyStart")}>
          <input
            type="date"
            value={policyStart}
            onChange={(e) => setPolicyStart(e.target.value)}
            className={fieldInputClass}
          />
        </PolicyField>
        <PolicyField label={t("policyExpiry")}>
          <input
            type="datetime-local"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className={fieldInputClass}
          />
        </PolicyField>
      </div>
    </div>
  );
}

function PolicyField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-[#9aa1ab]">
        {label}
      </span>
      {children}
    </label>
  );
}

// --- Activity tab -----------------------------------------------------------

const ACTIVITY_TYPES: Array<"call" | "note" | "sms" | "whatsapp" | "email"> = [
  "call",
  "note",
  "sms",
  "whatsapp",
  "email",
];

function ActivityTab({
  detail,
  onChanged,
}: {
  detail: DealDetailDTO;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const [type, setType] = useState<(typeof ACTIVITY_TYPES)[number]>("call");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    if (!note.trim()) return;
    start(async () => {
      await logActivityAction(detail.id, type, note);
      setNote("");
      onChanged();
    });
  }

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-xl border border-[#e6e8ec] bg-[#fafbfc] p-3">
        <div className="mb-2 flex gap-1.5">
          {ACTIVITY_TYPES.map((ty) => (
            <button
              key={ty}
              onClick={() => setType(ty)}
              className={`rounded-md px-2 py-1 text-[11px] font-semibold capitalize transition ${
                type === ty
                  ? "bg-[#4f46e5] text-white"
                  : "bg-white text-[#6b7280] hover:bg-[#f3f4f6]"
              }`}
            >
              {ty}
            </button>
          ))}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("addNote")}
          rows={2}
          className="w-full resize-none rounded-lg border border-[#e6e8ec] bg-white px-2.5 py-2 text-[13px] text-[#1f2430] outline-none focus:border-[#4f46e5]"
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={submit}
            disabled={!note.trim() || pending}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-[#4f46e5] px-3 text-[12px] font-semibold text-white hover:bg-[#4338ca] disabled:opacity-40"
          >
            <Plus className="size-3.5" />
            {t("logActivity")}
          </button>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#9aa1ab]">
          {t("timeline")}
        </h3>
        {detail.activities.length === 0 ? (
          <p className="py-6 text-center text-[12px] text-[#9aa1ab]">
            {t("noActivity")}
          </p>
        ) : (
          <ol className="relative space-y-3 border-l border-[#eef0f3] pl-4">
            {detail.activities.map((a) => (
              <li key={a.id} className="relative">
                <span className="absolute -left-[21px] top-1 size-2.5 rounded-full border-2 border-white bg-[#4f46e5]" />
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[12px] font-semibold capitalize text-[#1f2430]">
                    {a.type}
                  </span>
                  <span className="text-[11px] text-[#9aa1ab]">
                    {relativeTime(a.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 text-[12.5px] text-[#4b5563]">
                  {a.body || a.title}
                </p>
                <p className="mt-0.5 text-[11px] text-[#9aa1ab]">{a.author}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

// --- Messaging tab ----------------------------------------------------------

function MessagingTab({
  detail,
  onChanged,
}: {
  detail: DealDetailDTO;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const [channel, setChannel] = useState<"email" | "sms" | "whatsapp">("sms");
  const [to, setTo] = useState(detail.person.phone ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const [flash, setFlash] = useState<string | null>(null);

  function pickChannel(c: "email" | "sms" | "whatsapp") {
    setChannel(c);
    setTo(c === "email" ? detail.person.email ?? "" : detail.person.phone ?? "");
  }

  function submit() {
    if (!to.trim() || !body.trim()) return;
    start(async () => {
      const res = await sendMessageAction({
        dealId: detail.id,
        channel,
        to,
        subject: channel === "email" ? subject : undefined,
        body,
      });
      if (res.ok) {
        setBody("");
        setSubject("");
        setFlash(res.status === "mock" ? t("mockNotice") : t("outbound"));
        setTimeout(() => setFlash(null), 4000);
        onChanged();
      } else {
        setFlash(res.error ?? "Failed");
      }
    });
  }

  const channels = [
    { id: "email" as const, label: t("sendEmail"), Icon: Mail },
    { id: "sms" as const, label: t("sendSms"), Icon: MessageCircle },
    { id: "whatsapp" as const, label: t("sendWhatsapp"), Icon: Phone },
  ];

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-xl border border-[#e6e8ec] bg-[#fafbfc] p-3">
        <div className="mb-2 grid grid-cols-3 gap-1.5">
          {channels.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => pickChannel(id)}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-semibold transition ${
                channel === id
                  ? "bg-[#4f46e5] text-white"
                  : "bg-white text-[#6b7280] hover:bg-[#f3f4f6]"
              }`}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder={t("to")}
          className="mb-1.5 h-8 w-full rounded-lg border border-[#e6e8ec] bg-white px-2.5 text-[13px] outline-none focus:border-[#4f46e5]"
        />
        {channel === "email" && (
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t("subject")}
            className="mb-1.5 h-8 w-full rounded-lg border border-[#e6e8ec] bg-white px-2.5 text-[13px] outline-none focus:border-[#4f46e5]"
          />
        )}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("message")}
          rows={3}
          className="w-full resize-none rounded-lg border border-[#e6e8ec] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-[#4f46e5]"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[11px] text-[#9aa1ab]">{flash}</span>
          <button
            onClick={submit}
            disabled={!to.trim() || !body.trim() || pending}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-[#4f46e5] px-3 text-[12px] font-semibold text-white hover:bg-[#4338ca] disabled:opacity-40"
          >
            <Send className="size-3.5" />
            {pending ? t("sending") : t("send")}
          </button>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#9aa1ab]">
          {t("messageHistory")}
        </h3>
        {detail.messages.length === 0 ? (
          <p className="py-6 text-center text-[12px] text-[#9aa1ab]">
            {t("noMessages")}
          </p>
        ) : (
          <div className="space-y-2">
            {detail.messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-lg border px-3 py-2 ${
                  m.direction === "inbound"
                    ? "border-[#e6e8ec] bg-white"
                    : "border-[#e0e7ff] bg-[#eef2ff]"
                }`}
              >
                <div className="mb-0.5 flex items-center justify-between text-[11px]">
                  <span className="font-semibold uppercase text-[#6b7280]">
                    {m.channel} ·{" "}
                    {m.direction === "inbound" ? t("inbound") : t("outbound")}
                  </span>
                  <span className="text-[#9aa1ab]">{clockTime(m.createdAt)}</span>
                </div>
                {m.subject && (
                  <p className="text-[12px] font-semibold text-[#1f2430]">
                    {m.subject}
                  </p>
                )}
                <p className="text-[12.5px] text-[#4b5563]">{m.body}</p>
                <p className="mt-0.5 text-[10px] uppercase text-[#9aa1ab]">
                  {m.status}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Shared bits ------------------------------------------------------------

const panelInput =
  "h-8 w-full rounded-md border border-[#e6e8ec] bg-white px-2 text-[13px] text-[#1f2430] outline-none focus:border-[#4f46e5]";

function EditField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-[#9aa1ab]">
        {label}
      </span>
      {children}
    </label>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#9aa1ab]">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#f1f2f4] py-1.5 text-[13px] last:border-0">
      <span className="text-[#9aa1ab]">{label}</span>
      <span className="max-w-[60%] truncate font-medium text-[#1f2430]">
        {value}
      </span>
    </div>
  );
}
