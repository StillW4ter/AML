"use client";

/**
 * Flow builder — edit the public quote form for a single insurance type.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ Header: flow name, language, active toggle, copy link    │
 *   ├────────────────────┬─────────────────────────────────────┤
 *   │ Step list (left)   │ Step editor (right)                 │
 *   │ - reorder ↑↓       │ - icon, title (EN/KA/RU), type,     │
 *   │ - add new          │   options, conditions, required     │
 *   │ - select to edit   │                                     │
 *   └────────────────────┴─────────────────────────────────────┘
 *
 * On mobile the two columns stack; the step editor opens below the list when
 * a step is selected.
 *
 * State strategy:
 *   The component keeps the entire flow in local state so the editor feels
 *   instant. Every mutation also fires a Server Action so the DB stays in
 *   sync. We don't refresh the route after each keystroke — that would jank.
 *   We DO refresh after structural changes (add/delete/reorder) so the URL
 *   and shareable preview stay consistent.
 */
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  Eye,
  Copy,
  Check,
  GripVertical,
  Languages,
  Pencil,
  ExternalLink,
} from "lucide-react";
import { LANGS, LANG_LABEL, LOB_KEYS, type Lang } from "@/lib/i18n";
import {
  createStepAction,
  updateStepAction,
  deleteStepAction,
  reorderStepsAction,
  updateFlowAction,
  type StepType,
} from "@/app/crm/actions";
import type {
  QuoteFlowDTO,
  QuoteStepDTO,
  StepOption,
} from "@/lib/quote/flows";
import { LangProvider, useI18n } from "./i18n";
import { IconPicker, renderIcon } from "./icon-picker";

const TYPE_OPTIONS: { value: StepType; key: string }[] = [
  { value: "choice", key: "inputChoice" },
  { value: "multi", key: "inputMulti" },
  { value: "text", key: "inputText" },
  { value: "longText", key: "inputLongText" },
  { value: "number", key: "inputNumber" },
  { value: "date", key: "inputDate" },
  { value: "phone", key: "inputPhone" },
  { value: "email", key: "inputEmail" },
];

export function FlowBuilder({ initialFlow }: { initialFlow: QuoteFlowDTO }) {
  return (
    <LangProvider initial="en">
      <FlowBuilderInner initialFlow={initialFlow} />
    </LangProvider>
  );
}

function FlowBuilderInner({ initialFlow }: { initialFlow: QuoteFlowDTO }) {
  const { t, lang, setLang } = useI18n();
  const router = useRouter();
  const [flow, setFlow] = useState<QuoteFlowDTO>(initialFlow);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialFlow.steps[0]?.id ?? null,
  );
  const [, start] = useTransition();
  const [copied, setCopied] = useState(false);

  // When the route refetches (after add/reorder), reset our copy so we don't
  // diverge from the server. The editor sub-state for an in-progress text edit
  // is lost, which is acceptable — those changes already wrote on blur.
  useEffect(() => {
    setFlow(initialFlow);
    if (!initialFlow.steps.find((s) => s.id === selectedId)) {
      setSelectedId(initialFlow.steps[0]?.id ?? null);
    }
  }, [initialFlow, selectedId]);

  const selected = flow.steps.find((s) => s.id === selectedId) ?? null;
  const publicHref = `/quote/${flow.lob}`;

  function patchLocalStep(id: string, patch: Partial<QuoteStepDTO>) {
    setFlow((f) => ({
      ...f,
      steps: f.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  }

  function saveStep(id: string, patch: Partial<QuoteStepDTO>) {
    patchLocalStep(id, patch);
    start(async () => {
      await updateStepAction(id, {
        fieldKey: patch.fieldKey,
        type: patch.type,
        icon: patch.icon === undefined ? undefined : patch.icon,
        required: patch.required,
        titleEn: patch.titleEn,
        titleKa: patch.titleKa,
        titleRu: patch.titleRu,
        helpEn: patch.helpEn,
        helpKa: patch.helpKa,
        helpRu: patch.helpRu,
        options: patch.options,
        showIfStepKey: patch.showIfStepKey,
        showIfValue: patch.showIfValue,
      });
    });
  }

  function addStep() {
    start(async () => {
      const next = flow.steps.length + 1;
      const res = await createStepAction({
        flowId: flow.id,
        fieldKey: `field_${next}`,
        type: "choice",
        titleEn: "New question",
      });
      if (res.ok) {
        setFlow((f) => ({ ...f, steps: [...f.steps, res.step] }));
        setSelectedId(res.step.id);
        router.refresh();
      }
    });
  }

  function removeStep(id: string) {
    if (!confirm(t("confirmDeleteStep"))) return;
    start(async () => {
      await deleteStepAction(id);
      setFlow((f) => ({
        ...f,
        steps: f.steps.filter((s) => s.id !== id),
      }));
      if (selectedId === id) setSelectedId(null);
      router.refresh();
    });
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= flow.steps.length) return;
    const reordered = [...flow.steps];
    [reordered[index], reordered[target]] = [
      reordered[target],
      reordered[index],
    ];
    setFlow((f) => ({ ...f, steps: reordered }));
    start(async () => {
      await reorderStepsAction(
        flow.id,
        reordered.map((s) => s.id),
      );
      router.refresh();
    });
  }

  function updateFlowField(patch: Partial<QuoteFlowDTO>) {
    setFlow((f) => ({ ...f, ...patch }));
    start(async () => {
      await updateFlowAction(flow.id, {
        name: patch.name,
        defaultLang: patch.defaultLang,
        active: patch.active,
      });
    });
  }

  function copyPublicLink() {
    if (typeof window === "undefined") return;
    const link = `${window.location.origin}${publicHref}`;
    void navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  // Steps that could be referenced by a "show if" condition (everything before
  // the currently-selected step, plus any step with options to pick from).
  const conditionTargets = useMemo(() => {
    if (!selected) return [] as QuoteStepDTO[];
    return flow.steps.filter(
      (s) =>
        s.id !== selected.id &&
        (s.type === "choice" || s.type === "multi") &&
        s.options.length > 0,
    );
  }, [flow.steps, selected]);

  return (
    <>
      {/* --- Header --- */}
      <header className="flex flex-col gap-3 border-b border-[#e6e8ec] bg-white px-5 py-3 lg:h-14 lg:flex-row lg:items-center lg:gap-4 lg:py-0">
        <div className="flex items-center gap-3">
          <Link
            href="/crm/settings"
            className="grid size-8 place-items-center rounded-md text-[#9aa1ab] hover:bg-[#f6f7f9] hover:text-[#4f46e5]"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <input
              defaultValue={flow.name}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== flow.name) updateFlowField({ name: v });
              }}
              className="-mx-1 w-full max-w-xs rounded-md border border-transparent bg-transparent px-1 text-[15px] font-bold leading-tight text-[#1f2430] outline-none focus:border-[#4f46e5] focus:bg-white"
            />
            <p className="text-[11px] leading-tight text-[#9aa1ab]">
              {/* LOB_KEYS lookup is safe; the picker only allows known LOBs */}
              {t(LOB_KEYS[flow.lob] ?? "lobAuto")} ·{" "}
              <Link
                href={publicHref}
                target="_blank"
                className="inline-flex items-center gap-0.5 text-[#4f46e5] hover:underline"
              >
                {publicHref}
                <ExternalLink className="size-3" />
              </Link>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          {/* Editor language switcher — drives what's shown in textareas. */}
          <label className="flex h-8 items-center gap-1.5 rounded-md border border-[#e6e8ec] bg-white px-2 text-[12px] font-medium text-[#4b5563]">
            <Languages className="size-3.5 text-[#9aa1ab]" />
            Editing:
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className="bg-transparent text-[12px] font-semibold text-[#1f2430] outline-none"
            >
              {LANGS.map((code) => (
                <option key={code} value={code}>
                  {LANG_LABEL[code]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex h-8 items-center gap-1.5 rounded-md border border-[#e6e8ec] bg-white px-2 text-[12px] font-medium text-[#4b5563]">
            {t("flowDefaultLang")}:
            <select
              value={flow.defaultLang}
              onChange={(e) =>
                updateFlowField({ defaultLang: e.target.value as Lang })
              }
              className="bg-transparent text-[12px] font-semibold text-[#1f2430] outline-none"
            >
              {LANGS.map((code) => (
                <option key={code} value={code}>
                  {LANG_LABEL[code]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-[#e6e8ec] bg-white px-2.5 text-[12px] font-medium text-[#4b5563]">
            <input
              type="checkbox"
              checked={flow.active}
              onChange={(e) => updateFlowField({ active: e.target.checked })}
              className="size-3.5 accent-[#4f46e5]"
            />
            {t("flowActive")}
          </label>

          <button
            onClick={copyPublicLink}
            className="flex h-8 items-center gap-1.5 rounded-md border border-[#e6e8ec] bg-white px-2.5 text-[12px] font-medium text-[#4b5563] hover:border-[#4f46e5] hover:text-[#4f46e5]"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? t("copied") : t("copyPublicLink")}
          </button>

          <Link
            href={publicHref}
            target="_blank"
            className="flex h-8 items-center gap-1.5 rounded-md bg-[#4f46e5] px-3 text-[12px] font-semibold text-white hover:bg-[#4338ca]"
          >
            <Eye className="size-3.5" />
            Preview
          </Link>
        </div>
      </header>

      {/* --- Body --- */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-[#f6f7f9] p-4 sm:p-5">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
          {/* Step list */}
          <aside className="rounded-xl border border-[#e6e8ec] bg-white p-2">
            <header className="flex items-center justify-between px-2 pb-2 pt-1">
              <span className="text-[11px] font-bold uppercase tracking-wide text-[#9aa1ab]">
                {t("flowSteps")} · {flow.steps.length}
              </span>
              <button
                onClick={addStep}
                className="flex h-7 items-center gap-1 rounded-md bg-[#4f46e5] px-2 text-[11.5px] font-semibold text-white hover:bg-[#4338ca]"
              >
                <Plus className="size-3" />
                {t("addStep")}
              </button>
            </header>
            {flow.steps.length === 0 ? (
              <p className="px-2 py-6 text-center text-[12px] text-[#9aa1ab]">
                {t("noStepsYet")}
              </p>
            ) : (
              <ol className="space-y-1">
                {flow.steps.map((step, i) => {
                  const active = step.id === selectedId;
                  const title = pickTitle(step, lang);
                  return (
                    <li key={step.id}>
                      <div
                        className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 transition ${
                          active ? "bg-[#eef2ff]" : "hover:bg-[#f6f7f9]"
                        }`}
                      >
                        <button
                          onClick={() => setSelectedId(step.id)}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <GripVertical className="size-3.5 shrink-0 text-[#c2c6cd]" />
                          <span
                            className={`grid size-6 shrink-0 place-items-center rounded-md text-[11px] font-bold ${
                              active
                                ? "bg-[#4f46e5] text-white"
                                : "bg-[#f0f1f4] text-[#6b7280]"
                            }`}
                          >
                            {step.icon ? (
                              renderIcon(step.icon, "size-3.5")
                            ) : (
                              i + 1
                            )}
                          </span>
                          <span
                            className={`truncate text-[12.5px] ${
                              active
                                ? "font-semibold text-[#1f2430]"
                                : "text-[#4b5563]"
                            }`}
                          >
                            {title || "Untitled"}
                          </span>
                        </button>
                        <div className="flex flex-col">
                          <button
                            onClick={() => move(i, -1)}
                            disabled={i === 0}
                            className="text-[#9aa1ab] hover:text-[#4f46e5] disabled:opacity-25"
                          >
                            <ChevronUp className="size-3" />
                          </button>
                          <button
                            onClick={() => move(i, 1)}
                            disabled={i === flow.steps.length - 1}
                            className="text-[#9aa1ab] hover:text-[#4f46e5] disabled:opacity-25"
                          >
                            <ChevronDown className="size-3" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </aside>

          {/* Step editor */}
          <main>
            {selected ? (
              <StepEditor
                step={selected}
                lang={lang}
                conditionTargets={conditionTargets}
                onPatch={(patch) => saveStep(selected.id, patch)}
                onDelete={() => removeStep(selected.id)}
              />
            ) : (
              <div className="grid place-items-center rounded-xl border border-dashed border-[#e6e8ec] bg-white p-12 text-center">
                <Pencil className="size-6 text-[#c2c6cd]" />
                <p className="mt-2 text-[13px] font-medium text-[#6b7280]">
                  {flow.steps.length === 0
                    ? t("noStepsYet")
                    : "Select a step to edit"}
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}

function pickTitle(step: QuoteStepDTO, lang: Lang): string {
  if (lang === "ka") return step.titleKa || step.titleEn || step.titleRu || "";
  if (lang === "ru") return step.titleRu || step.titleEn || step.titleKa || "";
  return step.titleEn || step.titleKa || step.titleRu || "";
}

function pickHelp(step: QuoteStepDTO, lang: Lang): string {
  if (lang === "ka") return step.helpKa ?? "";
  if (lang === "ru") return step.helpRu ?? "";
  return step.helpEn ?? "";
}

function StepEditor({
  step,
  lang,
  conditionTargets,
  onPatch,
  onDelete,
}: {
  step: QuoteStepDTO;
  lang: Lang;
  conditionTargets: QuoteStepDTO[];
  onPatch: (patch: Partial<QuoteStepDTO>) => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const supportsOptions = step.type === "choice" || step.type === "multi";

  // Editing title/help is driven by the editor's currently selected language.
  function setTitleForLang(value: string) {
    if (lang === "ka") onPatch({ titleKa: value });
    else if (lang === "ru") onPatch({ titleRu: value });
    else onPatch({ titleEn: value });
  }
  function setHelpForLang(value: string) {
    if (lang === "ka") onPatch({ helpKa: value });
    else if (lang === "ru") onPatch({ helpRu: value });
    else onPatch({ helpEn: value });
  }

  const conditionTarget = conditionTargets.find(
    (s) => s.fieldKey === step.showIfStepKey,
  );

  return (
    <section className="space-y-4 rounded-xl border border-[#e6e8ec] bg-white p-4 sm:p-5">
      {/* Row 1: icon + type + field key + required */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#9aa1ab]">
            {t("stepIcon")}
          </label>
          <IconPicker
            value={step.icon}
            onChange={(icon) => onPatch({ icon })}
            compact
          />
        </div>
        <div className="min-w-[160px] flex-1">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#9aa1ab]">
            {t("stepType")}
          </label>
          <select
            value={step.type}
            onChange={(e) => onPatch({ type: e.target.value as StepType })}
            className="h-9 w-full rounded-lg border border-[#e6e8ec] bg-white px-2 text-[12.5px] outline-none focus:border-[#4f46e5]"
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {/* The type label uses the editor's current language. */}
                {t(o.key as Parameters<typeof t>[0])}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[140px] flex-1">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#9aa1ab]">
            {t("stepKey")}
          </label>
          <input
            defaultValue={step.fieldKey}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== step.fieldKey) onPatch({ fieldKey: v });
            }}
            className="h-9 w-full rounded-lg border border-[#e6e8ec] bg-white px-2.5 font-mono text-[12px] outline-none focus:border-[#4f46e5]"
          />
        </div>
        <label className="flex h-9 items-center gap-1.5 rounded-lg border border-[#e6e8ec] bg-white px-3 text-[12.5px] font-medium text-[#4b5563]">
          <input
            type="checkbox"
            checked={step.required}
            onChange={(e) => onPatch({ required: e.target.checked })}
            className="size-3.5 accent-[#4f46e5]"
          />
          {t("required")}
        </label>
        <button
          onClick={onDelete}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-[#fee2e2] bg-white px-3 text-[12.5px] font-semibold text-[#f43f5e] hover:bg-[#fef2f2]"
        >
          <Trash2 className="size-3.5" />
          {t("delete")}
        </button>
      </div>

      {/* Row 2: title + help (drives by selected editor lang, key by lang to remount) */}
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#9aa1ab]">
          {t("stepTitle")} · {LANG_LABEL[lang]}
        </label>
        <input
          key={`title-${step.id}-${lang}`}
          defaultValue={pickTitle(step, lang)}
          onBlur={(e) => setTitleForLang(e.target.value)}
          placeholder="What's your question?"
          className="h-10 w-full rounded-lg border border-[#e6e8ec] bg-white px-3 text-[14px] font-semibold outline-none focus:border-[#4f46e5]"
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#9aa1ab]">
          {t("stepHelp")} · {LANG_LABEL[lang]}
        </label>
        <textarea
          key={`help-${step.id}-${lang}`}
          defaultValue={pickHelp(step, lang)}
          onBlur={(e) => setHelpForLang(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-[#e6e8ec] bg-white p-2.5 text-[13px] outline-none focus:border-[#4f46e5]"
        />
      </div>

      {/* Options editor — only for choice / multi */}
      {supportsOptions && (
        <OptionsEditor
          step={step}
          lang={lang}
          onChange={(options) => onPatch({ options })}
        />
      )}

      {/* Conditional visibility */}
      {conditionTargets.length > 0 && (
        <div className="rounded-lg border border-[#f1f2f4] bg-[#f9fafb] p-3">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#9aa1ab]">
            {t("stepShowIf")}
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select
              value={step.showIfStepKey ?? ""}
              onChange={(e) =>
                onPatch({
                  showIfStepKey: e.target.value || null,
                  showIfValue: e.target.value ? step.showIfValue : null,
                })
              }
              className="h-9 rounded-lg border border-[#e6e8ec] bg-white px-2 text-[12.5px] outline-none focus:border-[#4f46e5]"
            >
              <option value="">{t("stepNone")}</option>
              {conditionTargets.map((s) => (
                <option key={s.id} value={s.fieldKey}>
                  {pickTitle(s, lang) || s.fieldKey}
                </option>
              ))}
            </select>
            {step.showIfStepKey && (
              <select
                value={step.showIfValue ?? ""}
                onChange={(e) =>
                  onPatch({ showIfValue: e.target.value || null })
                }
                className="h-9 rounded-lg border border-[#e6e8ec] bg-white px-2 text-[12.5px] outline-none focus:border-[#4f46e5]"
              >
                <option value="">—</option>
                {(conditionTarget?.options ?? []).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {pickOptionLabel(opt, lang)}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function pickOptionLabel(opt: StepOption, lang: Lang): string {
  if (lang === "ka") return opt.labelKa || opt.labelEn || "";
  if (lang === "ru") return opt.labelRu || opt.labelEn || "";
  return opt.labelEn || opt.labelKa || opt.labelRu || "";
}

function OptionsEditor({
  step,
  lang,
  onChange,
}: {
  step: QuoteStepDTO;
  lang: Lang;
  onChange: (next: StepOption[]) => void;
}) {
  const { t } = useI18n();

  function update(index: number, patch: Partial<StepOption>) {
    const next = step.options.map((o, i) => (i === index ? { ...o, ...patch } : o));
    onChange(next);
  }
  function add() {
    const next: StepOption = {
      value: `option_${step.options.length + 1}`,
      labelEn: "New option",
    };
    onChange([...step.options, next]);
  }
  function remove(index: number) {
    onChange(step.options.filter((_, i) => i !== index));
  }
  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= step.options.length) return;
    const next = [...step.options];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function setLabelForLang(index: number, value: string) {
    if (lang === "ka") update(index, { labelKa: value });
    else if (lang === "ru") update(index, { labelRu: value });
    else update(index, { labelEn: value });
  }

  return (
    <div>
      <header className="mb-1.5 flex items-center justify-between">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-[#9aa1ab]">
          {t("stepOptions")} · {LANG_LABEL[lang]}
        </label>
        <button
          type="button"
          onClick={add}
          className="flex h-7 items-center gap-1 rounded-md bg-[#4f46e5] px-2 text-[11.5px] font-semibold text-white hover:bg-[#4338ca]"
        >
          <Plus className="size-3" />
          {t("add")}
        </button>
      </header>
      {step.options.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[#e6e8ec] bg-[#f9fafb] py-3 text-center text-[12px] text-[#9aa1ab]">
          No options yet
        </p>
      ) : (
        <div className="space-y-1.5">
          {step.options.map((opt, i) => (
            <div
              key={i}
              className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[#e6e8ec] bg-white p-1.5"
            >
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="text-[#9aa1ab] hover:text-[#4f46e5] disabled:opacity-25"
                >
                  <ChevronUp className="size-3" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === step.options.length - 1}
                  className="text-[#9aa1ab] hover:text-[#4f46e5] disabled:opacity-25"
                >
                  <ChevronDown className="size-3" />
                </button>
              </div>
              <IconPicker
                value={opt.icon ?? null}
                onChange={(icon) => update(i, { icon })}
              />
              <input
                key={`opt-label-${i}-${lang}`}
                defaultValue={pickOptionLabel(opt, lang)}
                onBlur={(e) => setLabelForLang(i, e.target.value)}
                placeholder={t("stepOptionLabel")}
                className="h-8 min-w-[140px] flex-1 rounded-md border border-transparent bg-[#f6f7f9] px-2 text-[12.5px] outline-none focus:border-[#4f46e5] focus:bg-white"
              />
              <input
                defaultValue={opt.value}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== opt.value) update(i, { value: v });
                }}
                placeholder="value"
                className="h-8 w-24 rounded-md border border-transparent bg-[#f6f7f9] px-2 font-mono text-[11.5px] outline-none focus:border-[#4f46e5] focus:bg-white"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="grid size-7 place-items-center rounded-md text-[#9aa1ab] hover:bg-[#fef2f2] hover:text-[#f43f5e]"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
