"use client";

/** Settings — manage pipeline stages, custom fields, renewals, quote flows. */
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Settings as SettingsIcon,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  Check,
  Copy,
  GitBranch,
  SlidersHorizontal,
  BellRing,
  ListChecks,
  ExternalLink,
} from "lucide-react";
import { useI18n } from "./i18n";
import { LOB_KEYS } from "@/lib/i18n";
import type {
  SettingsData,
  StageDTO,
  FieldDefDTO,
} from "@/lib/crm/queries";
import type { QuoteFlowSummary } from "@/lib/quote/flows";
import type { RenewalSchedule } from "@/lib/crm/settings";
import {
  createStageAction,
  updateStageAction,
  reorderStagesAction,
  deleteStageAction,
  createFieldDefAction,
  updateFieldDefAction,
  deleteFieldDefAction,
  saveRenewalScheduleAction,
  createFlowAction,
  updateFlowAction,
  deleteFlowAction,
} from "@/app/crm/actions";

type Tab = "stages" | "fields" | "renewals" | "flows";
const LOBS = ["auto", "health", "home", "travel", "pet", "commercial"];
const FIELD_TYPES = ["text", "number", "date", "select", "boolean"];
const TYPE_KEYS: Record<string, "typeText" | "typeNumber" | "typeDate" | "typeSelect" | "typeBoolean"> = {
  text: "typeText",
  number: "typeNumber",
  date: "typeDate",
  select: "typeSelect",
  boolean: "typeBoolean",
};

export function SettingsView({ data }: { data: SettingsData }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("stages");

  const tabs: { id: Tab; label: string; icon: typeof GitBranch }[] = [
    { id: "stages", label: t("tabStages"), icon: GitBranch },
    { id: "fields", label: t("tabFields"), icon: SlidersHorizontal },
    { id: "renewals", label: t("tabRenewals"), icon: BellRing },
    { id: "flows", label: t("tabFlows"), icon: ListChecks },
  ];

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#e6e8ec] bg-white px-5">
        <SettingsIcon className="size-5 text-[#4f46e5]" />
        <div>
          <h1 className="text-[15px] font-bold leading-tight text-[#1f2430]">
            {t("settingsTitle")}
          </h1>
          <p className="text-[11px] leading-tight text-[#9aa1ab]">
            {t("settingsSubtitle")}
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#f6f7f9] p-5">
        <div className="mx-auto max-w-3xl">
          <nav className="mb-4 flex gap-1 overflow-x-auto rounded-lg border border-[#e6e8ec] bg-white p-1">
            {tabs.map((x) => (
              <button
                key={x.id}
                onClick={() => setTab(x.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition ${
                  tab === x.id
                    ? "bg-[#eef2ff] text-[#4f46e5]"
                    : "text-[#6b7280] hover:bg-[#f6f7f9]"
                }`}
              >
                <x.icon className="size-3.5" />
                {x.label}
              </button>
            ))}
          </nav>

          {tab === "stages" && <StagesTab stages={data.stages} />}
          {tab === "fields" && <FieldsTab fields={data.fields} />}
          {tab === "renewals" && <RenewalsTab renewal={data.renewal} />}
          {tab === "flows" && <FlowsTab flows={data.flows} />}
        </div>
      </div>
    </>
  );
}

// --- Stages -----------------------------------------------------------------

function StagesTab({ stages }: { stages: StageDTO[] }) {
  const { t, loc } = useI18n();
  const router = useRouter();
  const [, start] = useTransition();
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("open");
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= stages.length) return;
    const ids = stages.map((s) => s.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    run(() => reorderStagesAction(ids));
  }

  function add() {
    if (!newName.trim()) return;
    setError(null);
    start(async () => {
      const res = await createStageAction({ name: newName, type: newType });
      if (!res.ok) setError(res.error ?? "Failed");
      else setNewName("");
      router.refresh();
    });
  }

  return (
    <Card>
      <div className="divide-y divide-[#f1f2f4]">
        {stages.map((stage, i) => (
          <div key={stage.id} className="flex items-center gap-2 py-2">
            <div className="flex flex-col">
              <button
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="text-[#9aa1ab] hover:text-[#4f46e5] disabled:opacity-25"
              >
                <ChevronUp className="size-3.5" />
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === stages.length - 1}
                className="text-[#9aa1ab] hover:text-[#4f46e5] disabled:opacity-25"
              >
                <ChevronDown className="size-3.5" />
              </button>
            </div>
            <input
              defaultValue={loc(stage.name, stage.nameKa)}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== stage.name)
                  run(() => updateStageAction(stage.id, { name: v }));
              }}
              className="h-8 flex-1 rounded-md border border-transparent bg-[#f6f7f9] px-2 text-[13px] font-medium outline-none focus:border-[#4f46e5] focus:bg-white"
            />
            <select
              defaultValue={stage.type}
              onChange={(e) =>
                run(() => updateStageAction(stage.id, { type: e.target.value }))
              }
              className="h-8 rounded-md border border-[#e6e8ec] bg-white px-2 text-[12px] outline-none focus:border-[#4f46e5]"
            >
              <option value="open">{t("typeOpen")}</option>
              <option value="won">{t("typeWon")}</option>
              <option value="lost">{t("typeLost")}</option>
            </select>
            <button
              onClick={() => run(() => deleteStageAction(stage.id))}
              className="grid size-8 place-items-center rounded-md text-[#9aa1ab] hover:bg-[#fef2f2] hover:text-[#f43f5e]"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2 border-t border-[#f1f2f4] pt-3">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t("stageName")}
          className="h-9 flex-1 rounded-lg border border-[#e6e8ec] bg-white px-3 text-[13px] outline-none focus:border-[#4f46e5]"
        />
        <select
          value={newType}
          onChange={(e) => setNewType(e.target.value)}
          className="h-9 rounded-lg border border-[#e6e8ec] bg-white px-2 text-[12.5px] outline-none focus:border-[#4f46e5]"
        >
          <option value="open">{t("typeOpen")}</option>
          <option value="won">{t("typeWon")}</option>
          <option value="lost">{t("typeLost")}</option>
        </select>
        <button
          onClick={add}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-[#4f46e5] px-3.5 text-[13px] font-semibold text-white hover:bg-[#4338ca]"
        >
          <Plus className="size-4" />
          {t("addStage")}
        </button>
      </div>
      {error && <p className="mt-2 text-[12px] text-[#b91c1c]">{error}</p>}
    </Card>
  );
}

// --- Custom fields ----------------------------------------------------------

function FieldsTab({ fields }: { fields: FieldDefDTO[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [, start] = useTransition();
  const [scope, setScope] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState("text");
  const [required, setRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  function add() {
    if (!label.trim()) return;
    setError(null);
    start(async () => {
      const res = await createFieldDefAction({
        labelEn: label,
        type,
        required,
        lob: scope,
      });
      if (!res.ok) setError(res.error ?? "Failed");
      else setLabel("");
      router.refresh();
    });
  }

  const groups = ["", ...LOBS];

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#9aa1ab]">
          {t("addField")}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t("fieldLabel")}
            className="col-span-2 h-9 rounded-lg border border-[#e6e8ec] bg-white px-3 text-[13px] outline-none focus:border-[#4f46e5]"
          />
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="h-9 rounded-lg border border-[#e6e8ec] bg-white px-2 text-[12.5px] outline-none focus:border-[#4f46e5]"
          >
            <option value="">{t("sharedScope")}</option>
            {LOBS.map((lob) => (
              <option key={lob} value={lob}>
                {t(LOB_KEYS[lob])}
              </option>
            ))}
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="h-9 rounded-lg border border-[#e6e8ec] bg-white px-2 text-[12.5px] outline-none focus:border-[#4f46e5]"
          >
            {FIELD_TYPES.map((ft) => (
              <option key={ft} value={ft}>
                {t(TYPE_KEYS[ft])}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-[12.5px] text-[#4b5563]">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="size-3.5 accent-[#4f46e5]"
            />
            {t("requiredShort")}
          </label>
          <button
            onClick={add}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-[#4f46e5] px-3.5 text-[13px] font-semibold text-white hover:bg-[#4338ca]"
          >
            <Plus className="size-4" />
            {t("addField")}
          </button>
        </div>
        {error && <p className="mt-2 text-[12px] text-[#b91c1c]">{error}</p>}
      </Card>

      {groups.map((group) => {
        const groupFields = fields.filter((f) => f.lob === group);
        if (groupFields.length === 0) return null;
        return (
          <Card key={group || "shared"}>
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#9aa1ab]">
              {group === "" ? t("sharedScope") : t(LOB_KEYS[group])}
            </h3>
            <div className="divide-y divide-[#f1f2f4]">
              {groupFields.map((field) => (
                <div key={field.id} className="flex items-center gap-2 py-2">
                  <input
                    defaultValue={field.labelEn}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== field.labelEn)
                        run(() =>
                          updateFieldDefAction(field.id, { labelEn: v }),
                        );
                    }}
                    className="h-8 flex-1 rounded-md border border-transparent bg-[#f6f7f9] px-2 text-[13px] font-medium outline-none focus:border-[#4f46e5] focus:bg-white"
                  />
                  <span className="rounded bg-[#f0f1f4] px-1.5 py-0.5 text-[11px] font-medium text-[#6b7280]">
                    {t(TYPE_KEYS[field.type] ?? "typeText")}
                  </span>
                  <label className="flex items-center gap-1 text-[11px] text-[#6b7280]">
                    <input
                      type="checkbox"
                      defaultChecked={field.required}
                      onChange={(e) =>
                        run(() =>
                          updateFieldDefAction(field.id, {
                            required: e.target.checked,
                          }),
                        )
                      }
                      className="size-3.5 accent-[#4f46e5]"
                    />
                    {t("requiredShort")}
                  </label>
                  <button
                    onClick={() => run(() => deleteFieldDefAction(field.id))}
                    className="grid size-8 place-items-center rounded-md text-[#9aa1ab] hover:bg-[#fef2f2] hover:text-[#f43f5e]"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// --- Renewals ---------------------------------------------------------------

function RenewalsTab({ renewal }: { renewal: RenewalSchedule }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [offsets, setOffsets] = useState<number[]>(renewal.offsets);
  const [daily, setDaily] = useState(renewal.dailyForLastDays);
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);

  function addOffset() {
    const n = Number(draft);
    if (Number.isFinite(n) && n > 0 && !offsets.includes(n)) {
      setOffsets([...offsets, n].sort((a, b) => b - a));
    }
    setDraft("");
  }

  function save() {
    setSaved(false);
    start(async () => {
      await saveRenewalScheduleAction({ offsets, dailyForLastDays: daily });
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <Card>
      <h3 className="text-[13px] font-bold text-[#1f2430]">
        {t("renewalScheduleTitle")}
      </h3>
      <p className="mb-4 mt-0.5 text-[12px] text-[#9aa1ab]">
        {t("renewalIntro")}
      </p>

      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#9aa1ab]">
        {t("daysBefore")}
      </label>
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {offsets.map((n) => (
          <span
            key={n}
            className="flex items-center gap-1 rounded-md bg-[#eef2ff] px-2 py-1 text-[12px] font-semibold text-[#4f46e5]"
          >
            {n}d
            <button
              onClick={() => setOffsets(offsets.filter((x) => x !== n))}
              className="text-[#4f46e5]/60 hover:text-[#4f46e5]"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addOffset()}
          placeholder="14"
          inputMode="numeric"
          className="h-7 w-14 rounded-md border border-[#e6e8ec] bg-white px-2 text-[12px] outline-none focus:border-[#4f46e5]"
        />
        <button
          onClick={addOffset}
          className="flex h-7 items-center gap-1 rounded-md border border-[#e6e8ec] px-2 text-[12px] font-medium text-[#4b5563] hover:bg-[#f6f7f9]"
        >
          <Plus className="size-3" />
          {t("addInterval")}
        </button>
      </div>

      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#9aa1ab]">
        {t("dailyLastDays")}
      </label>
      <input
        value={daily}
        onChange={(e) => setDaily(Number(e.target.value) || 0)}
        inputMode="numeric"
        className="mb-4 h-9 w-24 rounded-lg border border-[#e6e8ec] bg-white px-3 text-[13px] outline-none focus:border-[#4f46e5]"
      />

      <div className="flex items-center gap-3 border-t border-[#f1f2f4] pt-3">
        <button
          onClick={save}
          disabled={pending}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-[#4f46e5] px-4 text-[13px] font-semibold text-white hover:bg-[#4338ca] disabled:opacity-50"
        >
          <Check className="size-4" />
          {t("save")}
        </button>
        {saved && (
          <span className="text-[12px] font-medium text-[#047857]">
            {t("saved")}
          </span>
        )}
      </div>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#e6e8ec] bg-white p-4">
      {children}
    </section>
  );
}

// --- Quote flows ------------------------------------------------------------

const LANG_LABELS: Record<"en" | "ka" | "ru", string> = {
  en: "English",
  ka: "ქართული",
  ru: "Русский",
};

function FlowsTab({ flows }: { flows: QuoteFlowSummary[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [, start] = useTransition();
  const [newLob, setNewLob] = useState("auto");
  const [newName, setNewName] = useState("");
  const [newLang, setNewLang] = useState<"en" | "ka" | "ru">("en");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // LOBs that don't yet have a flow — keeps the picker honest.
  const taken = new Set(flows.map((f) => f.lob));
  const available = LOBS.filter((l) => !taken.has(l));

  // Make sure the dropdown lands on an available LOB.
  if (available.length && !available.includes(newLob)) {
    setNewLob(available[0]);
  }

  function add() {
    if (!available.length) {
      setError("All insurance types already have a flow");
      return;
    }
    setError(null);
    start(async () => {
      const lobLabel = t(LOB_KEYS[newLob]);
      const res = await createFlowAction({
        lob: newLob,
        name: newName.trim() || `${lobLabel} quote`,
        defaultLang: newLang,
      });
      if (!res.ok) {
        setError(res.error ?? "Failed");
      } else {
        setNewName("");
        router.refresh();
      }
    });
  }

  function copyLink(lob: string) {
    if (typeof window === "undefined") return;
    const link = `${window.location.origin}/quote/${lob}`;
    void navigator.clipboard.writeText(link).then(() => {
      setCopied(lob);
      setTimeout(() => setCopied(null), 1800);
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#9aa1ab]">
          {t("addStep")}
        </h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select
            value={newLob}
            onChange={(e) => setNewLob(e.target.value)}
            disabled={!available.length}
            className="h-9 rounded-lg border border-[#e6e8ec] bg-white px-2 text-[12.5px] outline-none focus:border-[#4f46e5]"
          >
            {available.length === 0 ? (
              <option>—</option>
            ) : (
              available.map((lob) => (
                <option key={lob} value={lob}>
                  {t(LOB_KEYS[lob])}
                </option>
              ))
            )}
          </select>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t("flowName")}
            className="h-9 rounded-lg border border-[#e6e8ec] bg-white px-3 text-[13px] outline-none focus:border-[#4f46e5]"
          />
          <select
            value={newLang}
            onChange={(e) => setNewLang(e.target.value as "en" | "ka" | "ru")}
            className="h-9 rounded-lg border border-[#e6e8ec] bg-white px-2 text-[12.5px] outline-none focus:border-[#4f46e5]"
          >
            <option value="en">English</option>
            <option value="ka">ქართული</option>
            <option value="ru">Русский</option>
          </select>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            onClick={add}
            disabled={!available.length}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-[#4f46e5] px-3.5 text-[13px] font-semibold text-white hover:bg-[#4338ca] disabled:opacity-50"
          >
            <Plus className="size-4" />
            {t("addStep")}
          </button>
        </div>
        {error && <p className="mt-2 text-[12px] text-[#b91c1c]">{error}</p>}
      </Card>

      {flows.length === 0 ? (
        <Card>
          <p className="text-center text-[12.5px] text-[#9aa1ab]">
            {t("noStepsYet")}
          </p>
        </Card>
      ) : (
        <Card>
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#9aa1ab]">
            {t("flowsTitle")}
          </h3>
          <div className="divide-y divide-[#f1f2f4]">
            {flows.map((flow) => (
              <FlowRow
                key={flow.id}
                flow={flow}
                onCopy={() => copyLink(flow.lob)}
                copied={copied === flow.lob}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function FlowRow({
  flow,
  onCopy,
  copied,
}: {
  flow: QuoteFlowSummary;
  onCopy: () => void;
  copied: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [, start] = useTransition();

  function toggle() {
    start(async () => {
      await updateFlowAction(flow.id, { active: !flow.active });
      router.refresh();
    });
  }

  function remove() {
    if (!confirm(t("confirmDeleteStep"))) return;
    start(async () => {
      await deleteFlowAction(flow.id);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold text-[#1f2430]">
          {flow.name}
        </p>
        <p className="mt-0.5 text-[11.5px] text-[#9aa1ab]">
          {t(LOB_KEYS[flow.lob] ?? "lobAuto")} · {flow.stepCount}{" "}
          {t("flowSteps").toLowerCase()} · {LANG_LABELS[flow.defaultLang]}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={toggle}
          className={`flex h-7 items-center gap-1 rounded-md px-2 text-[11.5px] font-semibold ${
            flow.active
              ? "bg-[#dcfce7] text-[#15803d]"
              : "bg-[#f0f1f4] text-[#6b7280]"
          }`}
        >
          {flow.active ? "Active" : "Off"}
        </button>
        <button
          onClick={onCopy}
          title="Copy public link"
          className="flex h-7 items-center gap-1 rounded-md border border-[#e6e8ec] px-2 text-[11.5px] font-medium text-[#4b5563] hover:bg-[#f6f7f9]"
        >
          <Copy className="size-3" />
          {copied ? t("copied") : "/quote/" + flow.lob}
        </button>
        <Link
          href={`/crm/flows/${flow.id}`}
          className="flex h-7 items-center gap-1 rounded-md bg-[#4f46e5] px-2.5 text-[11.5px] font-semibold text-white hover:bg-[#4338ca]"
        >
          {t("edit")}
          <ExternalLink className="size-3" />
        </Link>
        <button
          onClick={remove}
          className="grid size-7 place-items-center rounded-md text-[#9aa1ab] hover:bg-[#fef2f2] hover:text-[#f43f5e]"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
