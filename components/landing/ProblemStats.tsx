"use client";

import { useEffect, useRef, useState } from "react";

import { useI18n } from "@/lib/i18n";
import { COUNTRIES, COUNTRY_CODES } from "@/lib/types";

/** The problem in four boxes. Each draws its picture when it scrolls into view. */

function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(([e]) => e?.isIntersecting && setSeen(true), { threshold: 0.3 });
    io.observe(node);
    return () => io.disconnect();
  }, []);
  return { ref, seen };
}

function useCount(target: number, run: boolean, ms = 1200) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    let f = 0;
    const s = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - s) / ms);
      setV(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) f = requestAnimationFrame(tick);
    };
    f = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(f);
  }, [target, run, ms]);
  return v;
}

/** ASEAN blue, red, yellow, plus the fit green: the only four colours on the page. */
const DOTS = ["#0033a0", "#0033a0", "#d0103a", "#ffc300", "#0033a0", "#0e7a4b"];

export function ProblemStats() {
  const { t } = useI18n();
  const { ref, seen } = useInView<HTMLDivElement>();
  const startups = useCount(11, seen);
  const investors = useCount(5, seen);
  const countries = useCount(11, seen);
  const pct = useCount(15, seen);

  return (
    <div ref={ref} className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Box source="Startup ASEAN / Cradle, 2025 (self-reported)">
        <p className="font-mono text-[40px] leading-none font-semibold">
          <span className="text-asean">{startups}k</span>
          <span className="text-[22px] text-ink-3"> + </span>
          <span className="text-asean-red">{investors}k</span>
        </p>
        <p className="mt-3 text-[14px] leading-snug text-ink-2">{t("problem.s1")}</p>
        <div className="mt-5 grid grid-cols-12 gap-1" aria-hidden>
          {Array.from({ length: 60 }, (_, i) => (
            <span
              key={i}
              className="aspect-square rounded-full transition-all duration-500"
              style={{
                background: seen ? DOTS[(i * 7) % DOTS.length] : "var(--stone)",
                transform: seen ? "scale(1)" : "scale(0.4)",
                transitionDelay: `${i * 16}ms`,
              }}
            />
          ))}
        </div>
        <p className="mt-3 text-[12px] text-ink-3">{t("problem.s1b")}</p>
      </Box>

      <Box source="ASEAN Secretariat, Oct 2025 · ERIA–ATLAS">
        <p className="font-mono text-[40px] leading-none font-semibold">
          {countries}
          <span className="ml-2 text-[16px] font-medium text-ink-3">{t("problem.s2unit")}</span>
        </p>
        <p className="mt-3 text-[14px] leading-snug text-ink-2">{t("problem.s2")}</p>
        <div className="mt-5 grid grid-cols-6 gap-1.5" aria-hidden>
          {COUNTRY_CODES.map((c, i) => (
            <span
              key={c}
              title={COUNTRIES[c].name}
              className="grid aspect-square place-items-center rounded-lg border border-line bg-paper text-[19px] transition-all duration-500"
              style={{ opacity: seen ? 1 : 0, transform: seen ? `rotate(${(i % 3) * 4 - 4}deg)` : "scale(0.6)", transitionDelay: `${i * 60}ms` }}
            >
              {COUNTRIES[c].flag}
            </span>
          ))}
          <span
            className="grid aspect-square place-items-center rounded-lg bg-saffron font-mono text-[13px] font-semibold text-saffron-deep transition-all duration-500"
            style={{ opacity: seen ? 1 : 0, transitionDelay: "700ms" }}
            title="Nexa: one door"
          >
            <svg viewBox="0 0 20 20" className="size-4">
              <path d="M6 3l8 7-8 7" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </Box>

      <Box source="Nikkei Asia, via KR-Asia">
        <div className="flex items-center gap-4">
          <Ring value={seen ? 0.155 : 0} />
          <div>
            <p className="font-mono text-[40px] leading-none font-semibold text-asean-red">{pct}%</p>
          </div>
        </div>
        <p className="mt-3 text-[14px] leading-snug text-ink-2">{t("problem.s3")}</p>
        <p className="mt-3 text-[12px] text-ink-3">{t("problem.s3b")}</p>
      </Box>

      <Box source="ERIA–ATLAS white paper on ASEAN startups">
        <p className="font-mono text-[40px] leading-none font-semibold">4</p>
        <p className="mt-3 text-[14px] leading-snug text-ink-2">{t("problem.s4")}</p>
        <ul className="mt-5 space-y-2.5">
          {(
            [
              ["problem.b1", "linear-gradient(90deg,#ff6b81,#d0103a)", 92],
              ["problem.b2", "linear-gradient(90deg,#ffd84d,#ffc300)", 78],
              ["problem.b3", "linear-gradient(90deg,#4fbf8a,#0e7a4b)", 64],
              ["problem.b4", "linear-gradient(90deg,#5b86e5,#0033a0)", 85],
            ] as const
          ).map(([key, bg, w], i) => (
            <li key={key} className="text-[12.5px] text-ink-2">
              <span>{t(key)}</span>
              <span className="mt-1 block h-2 overflow-hidden rounded-full bg-stone">
                <span
                  className="block h-full rounded-full transition-[width] duration-1000 ease-out"
                  style={{ width: seen ? `${w}%` : "0%", background: bg, transitionDelay: `${i * 120}ms` }}
                />
              </span>
            </li>
          ))}
        </ul>
      </Box>
    </div>
  );
}

function Box({ children, source }: { children: React.ReactNode; source: string }) {
  return (
    <article className="nx-card nx-lift flex flex-col p-6 text-ink">
      <div className="flex-1">{children}</div>
      <p className="mt-5 text-[11px] text-ink-3">{source}</p>
    </article>
  );
}

function Ring({ value }: { value: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 80 80" className="size-20 shrink-0 -rotate-90" aria-hidden>
      <circle cx="40" cy="40" r={r} fill="none" stroke="var(--stone)" strokeWidth="10" />
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        stroke="var(--asean-red)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value)}
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)" }}
      />
    </svg>
  );
}
