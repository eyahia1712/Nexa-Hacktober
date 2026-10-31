"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { Icon } from "@/components/Icon";
import { LANGS, useI18n } from "@/lib/i18n";
import { COUNTRIES } from "@/lib/types";
import type { Match, Opportunity } from "@/lib/types";
import { cn } from "@/lib/utils";

export const BTN_SAFFRON =
  "nx-micro nx-focus inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-saffron px-4 text-saffron-deep transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0";
export const BTN_INK =
  "nx-micro nx-focus inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-ink px-4 text-paper transition-colors hover:bg-[#2a2a28] disabled:opacity-50";
export const BTN_GHOST =
  "nx-micro nx-focus inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-line bg-card px-4 text-ink transition-colors hover:border-line-strong hover:bg-paper-2 disabled:opacity-50";
export const BTN_OUTLINE =
  "nx-micro nx-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-ink px-5 text-ink transition-colors hover:bg-ink hover:text-paper";
export const INPUT = "nx-focus mt-2 h-11 w-full rounded-lg border border-line bg-card px-3 text-[15px] placeholder:text-ink-3";

export function Micro({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("nx-micro text-ink-3", className)}>{children}</p>;
}

/** Language dropdown: all 12 languages, native name first. */
export function LanguageMenu({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGS.find((l) => l.code === lang)!;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("lang.label")}
        className="nx-focus inline-flex min-h-9 items-center gap-2 rounded-md border border-line bg-card px-3 text-[13.5px] text-ink transition-colors hover:border-line-strong"
      >
        <Icon name="globe" size={16} className="text-asean" />
        {compact ? <span className="uppercase">{current.code}</span> : <span className="max-w-[9rem] truncate">{current.native}</span>}
        <svg viewBox="0 0 12 12" className={cn("size-3 text-ink-3 transition-transform", open && "rotate-180")} aria-hidden>
          <path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {open ? (
        <div role="listbox" className="nx-card nx-rise absolute right-0 z-50 mt-2 w-[290px] overflow-hidden p-1.5">
          <p className="nx-micro px-2.5 pt-1.5 pb-2 text-ink-3">{t("lang.label")}</p>
          <div className="grid max-h-[60vh] overflow-y-auto">
            {LANGS.map((l) => (
              <button
                key={l.code}
                role="option"
                aria-selected={l.code === lang}
                onClick={() => {
                  setLang(l.code);
                  setOpen(false);
                }}
                className={cn(
                  "nx-focus flex items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                  l.code === lang ? "bg-saffron-soft" : "hover:bg-paper-2",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-medium">{l.native}</span>
                  <span className="block text-[11.5px] text-ink-3">{l.english}</span>
                </span>
                <span className="text-[13px] tracking-[0.1em]">{l.where}</span>
                {l.code === lang ? <Icon name="check" size={15} className="text-good" /> : <span className="w-[15px]" />}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const VERDICT_COLOR = { strong: "var(--good)", partial: "var(--warn)", no: "var(--bad)" } as const;

/** Small ring with the fit score in the middle. */
export function ScoreRing({ score, verdict, size = 52 }: { score: number; verdict: Match["verdict"]; size?: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const v = verdict === "no" ? 0 : score / 100;
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="24" cy="24" r={r} fill="none" stroke="var(--stone)" strokeWidth="5" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke={VERDICT_COLOR[verdict]}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <span className="font-mono text-[14px] font-semibold" style={{ color: VERDICT_COLOR[verdict] }}>
        {verdict === "no" ? "—" : score}
      </span>
    </span>
  );
}

export function Flag({ code, className }: { code: Opportunity["country"]; className?: string }) {
  return (
    <span title={COUNTRIES[code].name} className={className}>
      {COUNTRIES[code].flag}
    </span>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const { t } = useI18n();
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/40 p-4 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div role="dialog" aria-modal aria-label={title} className="nx-card nx-rise w-full max-w-xl p-6" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-4">
          <p className="text-[20px] font-medium">{title}</p>
          <button onClick={onClose} aria-label={t("common.close")} className="nx-focus grid size-9 place-items-center rounded-md text-ink-3 hover:bg-stone hover:text-ink">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

/** Indeterminate progress bar for Gemma calls. */
export function Loading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-1.5 w-28 overflow-hidden rounded-full bg-stone">
        <span className="nx-loading absolute inset-y-0 w-1/3 rounded-full bg-asean" />
      </div>
      <span className="text-[13.5px] text-ink-2">{label}</span>
    </div>
  );
}
