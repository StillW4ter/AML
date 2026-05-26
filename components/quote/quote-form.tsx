"use client";

/**
 * Public quote form — pixel-faithful to the Figma "Website" page.
 * Source: figma.com/design/FbENvpnjZAHaXWkoOV3QQp (Website > Step 1…N).
 *
 * Exact spec (taken from the user's Figma export):
 *
 *   ┌──────────────────────────── full-width header ─────────────────────┐
 *   │ 80px ┌─G̲u̲r̲d̲e̲n̲a̲              [⌫] [↻]                          ┐    │
 *   │      │ (#009BFB solid blue logo + wordmark)  rgba(0,0,0,0.05) btns│    │
 *   │      └──────────────────────────────────────────────────────────┘    │
 *   ├────── 1.5px rgba(0,0,0,0.10) bottom border ────────────────────────┤
 *   │                                                                    │
 *   │            Step 1                              1 of 17             │  <- Gilroy-Bold 16
 *   │     ███ ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── …                  │  <- 6px segments
 *   │            (filled #426DE8, rest #EDEDED, 13px gap)                │
 *   │                                                                    │
 *   │                    ┌─ 🎫  VEHICLE TYPE ──┐                          │  <- pill #EAF4FD/#2275E8
 *   │                    └────────────────────┘                          │
 *   │           What type of car do you want to insure?                  │  <- 44px Gilroy-Bold
 *   │                                                                    │
 *   │     ┌──── 236px ───┐  ┌──── 236px ──── ✓  ┌──── 236px ───┐         │
 *   │     │   #EFF3F7    │  │ #ECF3F9 + 2px    │  │  #EFF3F7    │         │
 *   │     │              │  │ outline #426DE8  │  │             │         │
 *   │     │   [image]    │  │   [image]        │  │   [image]   │         │
 *   │     │              │  │                  │  │             │         │
 *   │     │   Sedan      │  │   Jeep (SUV)     │  │   Coupe     │         │
 *   │     └──────────────┘  └──────────────────┘  └─────────────┘         │
 *   │                                                                    │
 *   │              ┌── Continue ─→ ──┐                                   │
 *   │              │ #2275E8→#7D5BE6 │                                   │
 *   │              └─────────────────┘                                   │
 *   └────────────────────────────────────────────────────────────────────┘
 *
 * Responsive behavior:
 *   - Desktop ≥1024px: 1000px-wide content stage, 3-col options
 *   - Tablet ≥640px:  fluid content, 2-col options
 *   - Mobile <640px:  single-col options, header collapses padding
 */
import { useMemo, useState, useTransition } from "react";
import {
  ArrowRight,
  Check,
  Globe,
  CircleCheckBig,
  Loader2,
  Ticket,
} from "lucide-react";
import {
  LANGS,
  LANG_LABEL,
  type Lang,
  type TKey,
  translate,
} from "@/lib/i18n";
import type {
  QuoteFlowDTO,
  QuoteStepDTO,
  StepOption,
} from "@/lib/quote/flows";
import { renderIcon, ICONS } from "@/components/crm/icon-picker";
import { submitQuoteAction } from "@/app/crm/actions";

type AnswerMap = Record<string, string | string[] | number>;
type Phase = "intro" | "step" | "contact" | "done";

interface Contact {
  name: string;
  phone: string;
  email: string;
  city: string;
}

// --- Exact Figma palette ----------------------------------------------------

const C = {
  ink: "#161E51",         // primary text
  inkMuted: "rgba(22,30,81,0.7)",
  inkFaint: "#5B6378",
  brand: "#009BFB",       // logo blue
  primary: "#426DE8",     // progress fill, selected outline, check badge
  ctaStart: "#2275E8",    // CTA gradient start
  ctaEnd: "#7D5BE6",      // CTA gradient end
  pillBg: "#EAF4FD",      // category pill background
  pillFg: "#2275E8",      // category pill text
  cardRest: "#EFF3F7",    // option card resting fill
  cardActive: "#ECF3F9",  // option card selected fill
  segRest: "#EDEDED",     // progress segment empty
  iconBtnBg: "rgba(0,0,0,0.05)",
  iconBtnIco: "#292D32",
  headerBg: "rgba(255,255,255,0.30)",
  headerLine: "rgba(0,0,0,0.10)",
  inputBg: "#F6F8FC",
  inputBorder: "#E5E8EF",
};

const CTA_GRADIENT = `linear-gradient(135deg, ${C.ctaStart} 0%, ${C.ctaEnd} 100%)`;

export function QuoteForm({ flow }: { flow: QuoteFlowDTO }) {
  const [lang, setLang] = useState<Lang>(flow.defaultLang);
  const t = (key: TKey) => translate(lang, key);

  const [phase, setPhase] = useState<Phase>("intro");
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [contact, setContact] = useState<Contact>({
    name: "",
    phone: "",
    email: "",
    city: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();
  const [reference, setReference] = useState<string | null>(null);

  const visibleSteps = useMemo(
    () => flow.steps.filter((s) => stepIsVisible(s, answers)),
    [flow.steps, answers],
  );

  const step = visibleSteps[stepIndex] ?? null;
  const totalSlides = visibleSteps.length + 1; // +1 for contact
  const currentSlide =
    phase === "contact" ? totalSlides : phase === "step" ? stepIndex + 1 : 0;

  function next() {
    setError(null);
    if (phase === "intro") {
      setPhase(visibleSteps.length === 0 ? "contact" : "step");
      setStepIndex(0);
      return;
    }
    if (phase === "step" && step) {
      if (step.required && !hasValue(answers[step.fieldKey])) {
        setError(translate(lang, "quoteRequired"));
        return;
      }
      if (stepIndex >= visibleSteps.length - 1) setPhase("contact");
      else setStepIndex((i) => i + 1);
    }
  }

  function back() {
    setError(null);
    if (phase === "contact") {
      if (visibleSteps.length > 0) {
        setPhase("step");
        setStepIndex(visibleSteps.length - 1);
      } else setPhase("intro");
      return;
    }
    if (phase === "step") {
      if (stepIndex === 0) setPhase("intro");
      else setStepIndex((i) => i - 1);
    }
  }

  function restart() {
    setPhase("intro");
    setStepIndex(0);
    setAnswers({});
    setContact({ name: "", phone: "", email: "", city: "" });
    setError(null);
    setReference(null);
  }

  function setAnswer(fieldKey: string, value: AnswerMap[string]) {
    setAnswers((prev) => ({ ...prev, [fieldKey]: value }));
  }

  function submit() {
    setError(null);
    if (!contact.name.trim() || !contact.phone.trim()) {
      setError(translate(lang, "quoteRequired"));
      return;
    }
    startSubmit(async () => {
      const res = await submitQuoteAction({
        lob: flow.lob,
        flowId: flow.id,
        answers,
        contact: {
          name: contact.name.trim(),
          phone: contact.phone.trim(),
          email: contact.email.trim() || undefined,
          city: contact.city.trim() || undefined,
        },
        lang,
      });
      if (!res.ok) setError(res.error ?? "Failed");
      else {
        setReference(res.reference);
        setPhase("done");
      }
    });
  }

  const showHeaderButtons = phase !== "intro" && phase !== "done";

  return (
    <div className="min-h-screen" style={{ color: C.ink }}>
      <Header
        lang={lang}
        setLang={setLang}
        showButtons={showHeaderButtons}
        onBack={back}
        onRestart={restart}
      />

      {/* Body — centered 1000px content area */}
      <div className="mx-auto w-full max-w-[1000px] px-5 py-10 sm:px-10 sm:py-14 lg:px-0">
        {(phase === "step" || phase === "contact") && (
          <SegmentedProgress
            current={currentSlide}
            total={totalSlides}
            stepLabel={
              phase === "contact"
                ? translate(lang, "quoteContactStepTitle")
                : `${translate(lang, "quoteStepCount")} ${currentSlide}`
            }
            ofLabel={`${currentSlide} ${translate(lang, "quoteOf")} ${totalSlides}`}
          />
        )}

        {phase === "intro" && (
          <IntroSlide
            t={t}
            onStart={next}
            lobLabel={flow.name}
            flowLob={flow.lob}
          />
        )}

        {phase === "step" && step && (
          <StepSlide
            step={step}
            stepNumber={currentSlide}
            lang={lang}
            value={answers[step.fieldKey]}
            onChange={(v) => setAnswer(step.fieldKey, v)}
            error={error}
            onNext={next}
            t={t}
          />
        )}

        {phase === "contact" && (
          <ContactSlide
            t={t}
            contact={contact}
            onChange={setContact}
            error={error}
            submitting={submitting}
            onSubmit={submit}
          />
        )}

        {phase === "done" && <ThanksSlide t={t} reference={reference} />}
      </div>
    </div>
  );
}

// ============================================================================
// Header — full-bleed, 80px lateral padding, semi-transparent white, 1.5px line
// ============================================================================

function Header({
  lang,
  setLang,
  showButtons,
  onBack,
  onRestart,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
  showButtons: boolean;
  onBack: () => void;
  onRestart: () => void;
}) {
  return (
    <header
      className="flex items-center justify-between px-5 py-5 sm:px-10 sm:py-6 lg:px-20"
      style={{
        backgroundColor: C.headerBg,
        borderBottom: `1.5px solid ${C.headerLine}`,
      }}
    >
      {/* Logo + wordmark, both in #009BFB */}
      <div className="flex items-center gap-1">
        <GurdenaMark size={36} />
        <GurdenaWord />
      </div>

      <div className="flex items-center gap-3">
        {/* Language picker — kept as a small icon button so it doesn't
            visually compete with the back/restart buttons in the Figma. */}
        <CircleIconButton ariaLabel="Language">
          <Globe className="size-5" style={{ color: C.iconBtnIco }} />
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Choose language"
          >
            {LANGS.map((code) => (
              <option key={code} value={code}>
                {LANG_LABEL[code]}
              </option>
            ))}
          </select>
        </CircleIconButton>

        {showButtons && (
          <>
            <CircleIconButton ariaLabel="Back" onClick={onBack} withGlow>
              {/* Back arrow — chevron-left to match the Figma stroke icon */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M13.1 4 L6.9 10 L13.1 16"
                  stroke={C.iconBtnIco}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </CircleIconButton>
            <CircleIconButton ariaLabel="Start over" onClick={onRestart}>
              {/* Refresh — counter-clockwise arc */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 6 V2 M3 6 H7 M3.5 6.5 A7.5 7.5 0 1 1 3 12"
                  stroke={C.iconBtnIco}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </CircleIconButton>
          </>
        )}
      </div>
    </header>
  );
}

function CircleIconButton({
  onClick,
  children,
  ariaLabel,
  withGlow,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  ariaLabel: string;
  withGlow?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="relative grid size-11 place-items-center overflow-hidden rounded-full transition-colors hover:bg-[rgba(0,0,0,0.08)]"
      style={{
        backgroundColor: C.iconBtnBg,
        boxShadow: "0px 0px 14px rgba(255, 255, 255, 0.25) inset",
      }}
    >
      {/* Subtle peach glow lifted from the Figma — only on the back button */}
      {withGlow && (
        <span
          className="pointer-events-none absolute -right-10 -top-10 size-20 rounded-full opacity-50"
          style={{
            background: "#E9C594",
            filter: "blur(25px)",
          }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

/**
 * Brand mark — a simplified blue letter form approximating the Figma asset.
 * The Figma stores the actual logo as a bitmap with a single solid path in
 * `#009BFB`, so we recreate the silhouette with a stylized lowercase "g"
 * built from a partial ring + descender tongue.
 */
function GurdenaMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill={C.brand}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M18 6
           A12 12 0 1 0 30 18
           L20 18
           L20 22
           L24.5 22
           A6.5 6.5 0 1 1 22 10
           Z"
      />
    </svg>
  );
}

function GurdenaWord() {
  // Wordmark — sized and weighted to balance the mark next to it.
  return (
    <span
      className="text-[22px] font-bold tracking-tight"
      style={{
        color: C.brand,
        fontFamily: "'Gilroy', 'Inter', system-ui, sans-serif",
      }}
    >
      Gurdena
    </span>
  );
}

// ============================================================================
// Segmented progress bar — one segment per total step, "Step N" + "N of M"
// ============================================================================

function SegmentedProgress({
  current,
  total,
  stepLabel,
  ofLabel,
}: {
  current: number;
  total: number;
  stepLabel: string;
  ofLabel: string;
}) {
  // Render one segment per step. Cap at 24 visually so very long flows
  // don't make hair-thin slivers; below that, segment count == total.
  const segmentCount = Math.min(total, 24);
  const filled = Math.max(
    0,
    Math.round((current / total) * segmentCount) || (current > 0 ? 1 : 0),
  );

  return (
    <div className="mb-10 flex flex-col gap-3">
      <div className="flex items-center justify-between text-[14px] font-bold sm:text-[16px]" style={{ color: C.ink }}>
        <span>{stepLabel}</span>
        <span>{ofLabel}</span>
      </div>
      <div className="flex items-center gap-[8px] sm:gap-[13px]">
        {Array.from({ length: segmentCount }).map((_, i) => (
          <span
            key={i}
            className="h-[5px] flex-1 rounded-full transition-colors sm:h-[6px]"
            style={{ backgroundColor: i < filled ? C.primary : C.segRest }}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Intro
// ============================================================================

function IntroSlide({
  t,
  onStart,
  lobLabel,
  flowLob,
}: {
  t: (k: TKey) => string;
  onStart: () => void;
  lobLabel: string;
  flowLob: string;
}) {
  return (
    <div className="flex flex-col items-center gap-10 py-6 text-center sm:py-12">
      <div
        className="grid size-32 place-items-center rounded-[28px] sm:size-40"
        style={{
          background:
            "linear-gradient(135deg, #EEF3FF 0%, #FAF5FF 50%, #FFF0F3 100%)",
        }}
      >
        <span className="text-[68px] leading-none sm:text-[84px]">
          {iconForLob(flowLob)}
        </span>
      </div>

      <div className="flex flex-col items-center gap-3">
        <h1
          className="max-w-[640px] text-[32px] font-bold leading-[1.1] tracking-tight sm:text-[44px] sm:leading-[1.1]"
          style={{ color: C.ink }}
        >
          {t("quotePageTitle")}
        </h1>
        <p
          className="max-w-[520px] text-[15px] leading-[1.55] sm:text-[16px]"
          style={{ color: C.inkMuted }}
        >
          {t("quoteIntro")}
        </p>
        <span
          className="mt-2 inline-block rounded-full px-4 py-1.5 text-[12px] font-semibold uppercase tracking-wide"
          style={{ backgroundColor: C.pillBg, color: C.pillFg }}
        >
          {lobLabel}
        </span>
      </div>

      <GradientButton onClick={onStart}>
        {t("quoteStartButton")}
        <ChevronRight />
      </GradientButton>
    </div>
  );
}

// ============================================================================
// Step
// ============================================================================

function StepSlide({
  step,
  stepNumber,
  lang,
  value,
  onChange,
  error,
  onNext,
  t,
}: {
  step: QuoteStepDTO;
  stepNumber: number;
  lang: Lang;
  value: AnswerMap[string] | undefined;
  onChange: (next: AnswerMap[string]) => void;
  error: string | null;
  onNext: () => void;
  t: (k: TKey) => string;
}) {
  const title = pickTitle(step, lang);
  const help = pickHelp(step, lang);
  const isOptionStep = step.type === "choice" || step.type === "multi";
  const category = categoryForStep(step, stepNumber, lang);

  return (
    <div className="flex flex-col items-center gap-11">
      <div className="flex w-full max-w-[779px] flex-col items-center gap-11">
        {/* Category pill + title */}
        <div className="flex flex-col items-center gap-5">
          {category && (
            <span
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-[14px] font-semibold uppercase leading-none tracking-[0.04em]"
              style={{ backgroundColor: C.pillBg, color: C.pillFg }}
            >
              <Ticket className="size-3.5" />
              {category}
            </span>
          )}
          <h2
            className="max-w-[540px] text-center text-[28px] font-bold leading-[1.1] tracking-tight sm:text-[36px] lg:text-[44px] lg:leading-[1.1]"
            style={{ color: C.ink }}
          >
            {title || "—"}
          </h2>
          {help && (
            <p
              className="max-w-[540px] text-center text-[14.5px] leading-[1.55] sm:text-[15.5px]"
              style={{ color: C.inkMuted }}
            >
              {help}
            </p>
          )}
        </div>

        {/* Input area */}
        <div className={`w-full ${isOptionStep ? "" : "max-w-[480px]"}`}>
          <StepInput step={step} lang={lang} value={value} onChange={onChange} />
        </div>

        {error && (
          <p className="text-center text-[14px] font-semibold text-rose-600">
            {error}
          </p>
        )}
      </div>

      <GradientButton onClick={onNext}>
        {t("quoteContinue")}
        <ChevronRight />
      </GradientButton>
    </div>
  );
}

// ============================================================================
// Contact
// ============================================================================

function ContactSlide({
  t,
  contact,
  onChange,
  error,
  submitting,
  onSubmit,
}: {
  t: (k: TKey) => string;
  contact: Contact;
  onChange: (next: Contact) => void;
  error: string | null;
  submitting: boolean;
  onSubmit: () => void;
}) {
  function patch(k: keyof Contact, v: string) {
    onChange({ ...contact, [k]: v });
  }
  return (
    <div className="flex flex-col items-center gap-11">
      <div className="flex w-full max-w-[779px] flex-col items-center gap-11">
        <div className="flex flex-col items-center gap-5">
          <span
            className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-[14px] font-semibold uppercase leading-none tracking-[0.04em]"
            style={{ backgroundColor: C.pillBg, color: C.pillFg }}
          >
            <Ticket className="size-3.5" />
            Contact
          </span>
          <h2
            className="max-w-[540px] text-center text-[28px] font-bold leading-[1.1] tracking-tight sm:text-[36px] lg:text-[44px] lg:leading-[1.1]"
            style={{ color: C.ink }}
          >
            {t("quoteContactStepTitle")}
          </h2>
          <p
            className="max-w-[540px] text-center text-[14.5px] leading-[1.55] sm:text-[15.5px]"
            style={{ color: C.inkMuted }}
          >
            {t("quoteIntro")}
          </p>
        </div>

        <div className="grid w-full max-w-[640px] grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={`${t("quoteName")} *`}>
            <TextInput value={contact.name} onChange={(v) => patch("name", v)} />
          </Field>
          <Field label={`${t("quotePhone")} *`}>
            <TextInput
              value={contact.phone}
              onChange={(v) => patch("phone", v)}
              type="tel"
              placeholder="+995 5XX XX XX XX"
            />
          </Field>
          <Field label={t("quoteEmail")}>
            <TextInput
              value={contact.email}
              onChange={(v) => patch("email", v)}
              type="email"
            />
          </Field>
          <Field label={t("quoteCity")}>
            <TextInput value={contact.city} onChange={(v) => patch("city", v)} />
          </Field>
        </div>

        {error && (
          <p className="text-center text-[14px] font-semibold text-rose-600">
            {error}
          </p>
        )}
      </div>

      <GradientButton onClick={onSubmit} disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {t("quoteSubmitting")}
          </>
        ) : (
          <>
            <Check className="size-4" />
            {t("quoteSubmit")}
          </>
        )}
      </GradientButton>
    </div>
  );
}

// ============================================================================
// Thanks
// ============================================================================

function ThanksSlide({
  t,
  reference,
}: {
  t: (k: TKey) => string;
  reference: string | null;
}) {
  return (
    <div className="flex flex-col items-center gap-6 py-10 text-center sm:py-16">
      <span className="grid size-20 place-items-center rounded-full bg-emerald-50">
        <CircleCheckBig className="size-10 text-emerald-500" />
      </span>
      <h1
        className="text-[28px] font-bold leading-[1.1] tracking-tight sm:text-[44px]"
        style={{ color: C.ink }}
      >
        {t("quoteThanksTitle")}
      </h1>
      <p
        className="max-w-[440px] text-[15px] leading-[1.55] sm:text-[16px]"
        style={{ color: C.inkMuted }}
      >
        {t("quoteThanksBody")}
      </p>
      {reference && (
        <p
          className="mt-1 inline-block rounded-full px-3 py-1 font-mono text-[12px] font-semibold"
          style={{ backgroundColor: C.pillBg, color: C.pillFg }}
        >
          #{reference}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Step inputs by question type
// ============================================================================

function StepInput({
  step,
  lang,
  value,
  onChange,
}: {
  step: QuoteStepDTO;
  lang: Lang;
  value: AnswerMap[string] | undefined;
  onChange: (next: AnswerMap[string]) => void;
}) {
  if (step.type === "choice") {
    const selected = typeof value === "string" ? value : "";
    return (
      <OptionRow count={step.options.length}>
        {step.options.map((opt) => (
          <OptionCard
            key={opt.value}
            option={opt}
            lang={lang}
            active={selected === opt.value}
            onClick={() => onChange(opt.value)}
          />
        ))}
      </OptionRow>
    );
  }

  if (step.type === "multi") {
    const selected = Array.isArray(value) ? value : [];
    const toggle = (v: string) => {
      if (selected.includes(v)) onChange(selected.filter((x) => x !== v));
      else onChange([...selected, v]);
    };
    return (
      <OptionRow count={step.options.length}>
        {step.options.map((opt) => (
          <OptionCard
            key={opt.value}
            option={opt}
            lang={lang}
            active={selected.includes(opt.value)}
            multi
            onClick={() => toggle(opt.value)}
          />
        ))}
      </OptionRow>
    );
  }

  if (step.type === "longText") {
    return (
      <textarea
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        className="w-full rounded-2xl border-2 px-4 py-3 text-[15px] outline-none transition-colors"
        style={{
          borderColor: C.inputBorder,
          backgroundColor: C.inputBg,
          color: C.ink,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = C.primary;
          e.currentTarget.style.backgroundColor = "white";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = C.inputBorder;
          e.currentTarget.style.backgroundColor = C.inputBg;
        }}
      />
    );
  }

  const inputType =
    step.type === "number"
      ? "number"
      : step.type === "date"
      ? "date"
      : step.type === "phone"
      ? "tel"
      : step.type === "email"
      ? "email"
      : "text";

  return (
    <TextInput
      value={
        typeof value === "string" || typeof value === "number"
          ? String(value)
          : ""
      }
      onChange={(v) => {
        if (step.type === "number") {
          const n = Number(v);
          onChange(Number.isFinite(n) && v !== "" ? n : v);
        } else onChange(v);
      }}
      type={inputType}
      inputMode={step.type === "number" ? "numeric" : undefined}
      large
    />
  );
}

/**
 * Lay out option cards in a single horizontal row when there's space.
 * Stretches to fill the width with a 16px gap between cards, matching
 * the Figma's `align-self: stretch + flex-1` pattern.
 */
function OptionRow({
  count,
  children,
}: {
  count: number;
  children: React.ReactNode;
}) {
  // Pick the grid columns per breakpoint based on option count:
  // ≤4 → fit on one row at the largest breakpoint.
  // ≥5 → wrap to two rows.
  let cols: string;
  if (count <= 2) cols = "grid-cols-1 sm:grid-cols-2";
  else if (count === 3) cols = "grid-cols-1 sm:grid-cols-3";
  else if (count === 4) cols = "grid-cols-2 lg:grid-cols-4";
  else if (count <= 6) cols = "grid-cols-2 sm:grid-cols-3";
  else cols = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";

  return <div className={`grid w-full gap-4 ${cols}`}>{children}</div>;
}

function OptionCard({
  option,
  lang,
  active,
  multi,
  onClick,
}: {
  option: StepOption;
  lang: Lang;
  active: boolean;
  multi?: boolean;
  onClick: () => void;
}) {
  const label = pickOptionLabel(option, lang);
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex h-[200px] flex-col items-center justify-between overflow-hidden rounded-3xl p-5 text-center transition-all duration-150 sm:h-[236px] sm:p-6"
      style={{
        backgroundColor: active ? C.cardActive : C.cardRest,
        outline: active ? `2px solid ${C.primary}` : "2px solid transparent",
        outlineOffset: "-2px",
      }}
    >
      {/* Selected check badge — small blue rounded square top-right (per Figma) */}
      {active && (
        <span
          className="absolute right-4 top-4 grid size-6 place-items-center rounded-md text-white"
          style={{ backgroundColor: C.primary }}
        >
          <Check className="size-3.5" strokeWidth={3} />
        </span>
      )}

      {/* Illustration area — Lucide icon stand-in for the Figma car photos.
          Larger size to fill the visual real estate. */}
      <span className="flex flex-1 items-center justify-center">
        {option.icon && ICONS[option.icon] ? (
          renderIcon(
            option.icon,
            active
              ? "size-20 sm:size-24"
              : "size-20 sm:size-24 opacity-80",
          )
        ) : (
          <span
            className="grid size-20 place-items-center rounded-2xl text-[18px] font-bold uppercase sm:size-24"
            style={{ backgroundColor: "white", color: C.inkFaint }}
          >
            {option.value.slice(0, 2)}
          </span>
        )}
      </span>

      <span
        className="text-[16px] font-semibold leading-tight sm:text-[18px] lg:text-[20px]"
        style={{ color: C.ink }}
      >
        {label}
        {multi && active && (
          <Check className="ml-1 inline size-4" style={{ color: C.primary }} />
        )}
      </span>
    </button>
  );
}

function TextInput({
  value,
  onChange,
  type = "text",
  placeholder,
  inputMode,
  large,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  large?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      className={`w-full rounded-2xl border-2 px-4 font-medium outline-none transition-colors ${
        large ? "h-14 text-[16px]" : "h-12 text-[15px]"
      }`}
      style={{
        borderColor: C.inputBorder,
        backgroundColor: C.inputBg,
        color: C.ink,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = C.primary;
        e.currentTarget.style.backgroundColor = "white";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = C.inputBorder;
        e.currentTarget.style.backgroundColor = C.inputBg;
      }}
    />
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-left">
      <span
        className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-wide"
        style={{ color: C.inkFaint }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

// ============================================================================
// Continue button — gradient, ~52px tall, with subtle peach trailing glow
// ============================================================================

function GradientButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative flex h-[52px] items-center justify-center gap-2 overflow-hidden px-7 text-[15px] font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-70 sm:text-[16px]"
      style={{
        background: CTA_GRADIENT,
        borderRadius: 32,
        boxShadow: "0 14px 30px -10px rgba(34,117,232,0.45)",
      }}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      {/* Peach decorative glow on the trailing edge — straight from the Figma */}
      <span
        className="pointer-events-none absolute -right-10 -top-6 size-24 rounded-full opacity-50"
        style={{
          background: "#E9C594",
          filter: "blur(25px)",
        }}
      />
    </button>
  );
}

function ChevronRight() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7.5 4 L13.7 10 L7.5 16"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function hasValue(v: AnswerMap[string] | undefined): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return Number.isFinite(v);
  if (Array.isArray(v)) return v.length > 0;
  return false;
}

function stepIsVisible(step: QuoteStepDTO, answers: AnswerMap): boolean {
  if (!step.showIfStepKey || !step.showIfValue) return true;
  const target = answers[step.showIfStepKey];
  if (Array.isArray(target)) return target.includes(step.showIfValue);
  return target === step.showIfValue;
}

function pickTitle(step: QuoteStepDTO, lang: Lang): string {
  if (lang === "ka") return step.titleKa || step.titleEn || step.titleRu || "";
  if (lang === "ru") return step.titleRu || step.titleEn || step.titleKa || "";
  return step.titleEn || step.titleKa || step.titleRu || "";
}

function pickHelp(step: QuoteStepDTO, lang: Lang): string | null {
  const raw =
    lang === "ka" ? step.helpKa : lang === "ru" ? step.helpRu : step.helpEn;
  return raw && raw.trim() ? raw : null;
}

function pickOptionLabel(opt: StepOption, lang: Lang): string {
  if (lang === "ka") return opt.labelKa || opt.labelEn || "";
  if (lang === "ru") return opt.labelRu || opt.labelEn || "";
  return opt.labelEn || opt.labelKa || opt.labelRu || "";
}

function iconForLob(lob: string): string {
  switch (lob) {
    case "auto":
      return "🚗";
    case "health":
      return "❤️";
    case "home":
      return "🏠";
    case "travel":
      return "✈️";
    case "pet":
      return "🐾";
    case "commercial":
      return "💼";
    default:
      return "🛡️";
  }
}

function categoryForStep(
  step: QuoteStepDTO,
  stepNumber: number,
  _lang: Lang,
): string {
  const fromIcon: Record<string, string> = {
    Car: "Vehicle type",
    Truck: "Vehicle type",
    Bus: "Vehicle type",
    Bike: "Vehicle type",
    Plane: "Travel",
    Ship: "Travel",
    Home: "Property",
    Building2: "Property",
    Hotel: "Property",
    Briefcase: "Coverage",
    ShieldCheck: "Coverage",
    Shield: "Coverage",
    Heart: "Health",
    HeartPulse: "Health",
    Stethoscope: "Health",
    Pill: "Health",
    Hospital: "Health",
    Activity: "Health",
    User: "Personal",
    Users: "Family",
    UserPlus: "Family",
    Baby: "Family",
    Dog: "Pet",
    Cat: "Pet",
    PawPrint: "Pet",
    Calendar: "Timing",
    Clock: "Timing",
    MapPin: "Location",
    Globe: "Location",
    Phone: "Contact",
    Mail: "Contact",
    MessageCircle: "Contact",
    DollarSign: "Pricing",
    CreditCard: "Pricing",
    Wallet: "Pricing",
    PiggyBank: "Pricing",
    TrendingUp: "Pricing",
  };
  if (step.icon && fromIcon[step.icon]) return fromIcon[step.icon];
  return `Step ${stepNumber}`;
}
