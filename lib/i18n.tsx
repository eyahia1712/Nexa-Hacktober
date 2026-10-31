"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import en from "@/messages/en.json";

export type Key = keyof typeof en;
type Dict = Partial<Record<string, string>>;

/** One language per line, with the countries where it is widely used. */
export const LANGS = [
  { code: "en", native: "English", english: "English", where: "🌏" },
  { code: "ms", native: "Bahasa Melayu", english: "Malay", where: "🇲🇾 🇧🇳 🇸🇬" },
  { code: "id", native: "Bahasa Indonesia", english: "Indonesian", where: "🇮🇩" },
  { code: "zh", native: "中文", english: "Chinese", where: "🇸🇬 🇲🇾" },
  { code: "ta", native: "தமிழ்", english: "Tamil", where: "🇸🇬 🇲🇾" },
  { code: "th", native: "ไทย", english: "Thai", where: "🇹🇭" },
  { code: "vi", native: "Tiếng Việt", english: "Vietnamese", where: "🇻🇳" },
  { code: "fil", native: "Filipino", english: "Filipino", where: "🇵🇭" },
  { code: "km", native: "ខ្មែរ", english: "Khmer", where: "🇰🇭" },
  { code: "lo", native: "ລາວ", english: "Lao", where: "🇱🇦" },
  { code: "my", native: "မြန်မာ", english: "Burmese", where: "🇲🇲" },
  { code: "tet", native: "Tetun", english: "Tetum", where: "🇹🇱" },
] as const;
export type Lang = (typeof LANGS)[number]["code"];

const LOADERS: Record<Exclude<Lang, "en">, () => Promise<{ default: Dict }>> = {
  ms: () => import("@/messages/ms.json"),
  id: () => import("@/messages/id.json"),
  zh: () => import("@/messages/zh.json"),
  ta: () => import("@/messages/ta.json"),
  th: () => import("@/messages/th.json"),
  vi: () => import("@/messages/vi.json"),
  fil: () => import("@/messages/fil.json"),
  km: () => import("@/messages/km.json"),
  lo: () => import("@/messages/lo.json"),
  my: () => import("@/messages/my.json"),
  tet: () => import("@/messages/tet.json"),
};

type Vars = Record<string, string | number>;
type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: Key | string, vars?: Vars) => string; langName: string };

const I18n = createContext<Ctx | null>(null);

const fill = (text: string, vars?: Vars) => (vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [dict, setDict] = useState<Dict>({});

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem("nexa-lang", next);
    } catch {
      /* fine: the choice just won't be remembered */
    }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("nexa-lang") as Lang | null;
      if (saved && LANGS.some((l) => l.code === saved)) setLangState(saved);
    } catch {
      /* no storage */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    if (lang === "en") {
      setDict({});
      return;
    }
    let live = true;
    LOADERS[lang]()
      .then((m) => live && setDict(m.default))
      .catch(() => live && setDict({}));
    return () => {
      live = false;
    };
  }, [lang]);

  const t = useCallback((key: string, vars?: Vars) => fill(dict[key] ?? (en as Dict)[key] ?? key, vars), [dict]);
  const langName = LANGS.find((l) => l.code === lang)!.english;

  return <I18n.Provider value={{ lang, setLang, t, langName }}>{children}</I18n.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18n);
  if (!ctx) throw new Error("useI18n must be used inside LangProvider");
  return ctx;
}
