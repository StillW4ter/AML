"use client";

/**
 * React binding for the multilingual dictionary in lib/i18n.ts.
 *
 * Supports en / ka / ru. `toggle()` cycles through the three languages so
 * existing call sites that just want "next language" keep working; new
 * call sites can use `setLang()` directly to drive a dropdown.
 */
import { createContext, useContext, useState, type ReactNode } from "react";
import {
  LANGS,
  type Lang,
  type TKey,
  translate,
  localized,
} from "@/lib/i18n";

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Cycle through en → ka → ru → en. */
  toggle: () => void;
  /** Translate a dictionary key. */
  t: (key: TKey) => string;
  /** Pick the localized variant of a value with English / Georgian / Russian forms. */
  loc: (
    en: string | null | undefined,
    ka: string | null | undefined,
    ru?: string | null,
  ) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function LangProvider({
  children,
  initial = "en",
}: {
  children: ReactNode;
  initial?: Lang;
}) {
  const [lang, setLang] = useState<Lang>(initial);
  const value: I18nValue = {
    lang,
    setLang,
    toggle: () => {
      const idx = LANGS.indexOf(lang);
      const next = LANGS[(idx + 1) % LANGS.length];
      setLang(next);
    },
    t: (key) => translate(lang, key),
    loc: (en, ka, ru) => localized(lang, en, ka, ru),
  };
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <LangProvider>");
  return ctx;
}
