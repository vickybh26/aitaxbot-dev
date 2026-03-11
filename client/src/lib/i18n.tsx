// ─────────────────────────────────────────────────────────────────────────────
// Lightweight i18n — drop-in compatible with react-i18next's useTranslation()
// Replace with react-i18next later by swapping this file only.
// ─────────────────────────────────────────────────────────────────────────────

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import en, { type Translations } from "@/locales/en";
import hi from "@/locales/hi";

// ── Supported languages ───────────────────────────────────────────────────────
export type Lang = "en" | "hi";

const STORAGE_KEY = "atb_lang";
const DEFAULT_LANG: Lang = "en";

const LOCALES: Record<Lang, Translations> = { en, hi };

// ── Nested key resolver  e.g. "nav.login" → "लॉगिन" ─────────────────────────
type NestedKeyOf<T> = T extends object
  ? { [K in keyof T]: K extends string
      ? T[K] extends object
        ? `${K}.${NestedKeyOf<T[K]>}`
        : K
      : never
    }[keyof T]
  : never;

export type TranslationKey = NestedKeyOf<Translations>;

function resolve(obj: Record<string, unknown>, path: string): string {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return path;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : path;
}

// ── Context ───────────────────────────────────────────────────────────────────
interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (stored && stored in LOCALES) return stored;
    // Auto-detect browser language
    const browser = navigator.language.slice(0, 2) as Lang;
    return browser in LOCALES ? browser : DEFAULT_LANG;
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
    // Update <html lang=""> for SEO
    document.documentElement.lang = l;
  }, []);

  // Set initial html lang
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>): string => {
      let str = resolve(LOCALES[lang] as Record<string, unknown>, key);
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          str = str.replace(`{${k}}`, String(v));
        });
      }
      return str;
    },
    [lang],
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslation must be used inside <I18nProvider>");
  return ctx;
}
