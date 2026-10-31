"use client";

import { useEffect, useRef, useState } from "react";
import { COUNTRIES, COUNTRY_CODES } from "@/lib/types";

/** The problem in four boxes. Each draws its picture as it scrolls into view. */

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

export function ProblemStats() {
  const { ref, seen } = useInView<HTMLDivElement>();
  const startups = useCount(11, seen);
  const investors = useCount(5, seen);
  const countries = useCount(10, seen);
  const pct = useCount(15, seen);

  return (
    <div ref={ref} className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1 · connections */}
      <Box source="Startup ASEAN / Cradle, 2025 (self-reported)">
        <p className="font-mono text-[40px] font-semibold leading-none">
          <span className="text-blue">{startups}k</span>
          <span className="text-[22px] text-ink-3"> + </span>
          <span className="text-red">{investors}k</span>
        </p>
        <p className="mt-3 text-[14px] leading-snug text-ink-2">startups and investors, connected</p>
        <div className="mt-5 grid grid-cols-12 gap-1" aria-hidden>
          {Array.from({ length: 48 }, (_, i) => (
            <span
              key={i}
              className="aspect-square rounded-full transition-all duration-500"
              style={{
                background: seen ? (i % 3 === 2 ? "#d0103a" : "#0033a0") : "#edf1f7",
                transform: seen ? "scale(1)" : "scale(0.4)",
                transitionDelay: `${i * 16}ms`,
              }}
            />
          ))}
        </div>
        <p className="mt-3 text-[12px] text-ink-3">
          but <b className="text-ink">which one fits you?</b>
        </p>
      </Box>

      {/* 2 · fragmentation */}
      <Box source="ERIA–ATLAS white paper on ASEAN startups">
        <p className="font-mono text-[40px] font-semibold leading-none">
          {countries}
          <span className="ml-2 text-[16px] font-medium text-ink-3">countries</span>
        </p>
        <p className="mt-3 text-[14px] leading-snug text-ink-2">10 portals, 10 rulebooks, many languages</p>
        <div className="mt-5 grid grid-cols-5 gap-1.5" aria-hidden>
          {COUNTRY_CODES.map((c, i) => (
            <span
              key={c}
              title={COUNTRIES[c].name}
              className="grid aspect-square place-items-center rounded-lg border border-line text-[20px] transition-all duration-500"
              style={{ opacity: seen ? 1 : 0, transform: seen ? `rotate(${(i % 3) * 4 - 4}deg)` : "scale(0.6)", transitionDelay: `${i * 60}ms` }}
            >
              {COUNTRIES[c].flag}
            </span>
          ))}
        </div>
      </Box>

      {/* 3 · regional founders */}
      <Box source="Nikkei Asia, via KR-Asia">
        <div className="flex items-center justify-between gap-4">
          <p className="font-mono text-[40px] font-semibold leading-none text-red">{pct}%</p>
          <Ring value={seen ? 0.155 : 0} />
        </div>
        <p className="mt-3 text-[14px] leading-snug text-ink-2">of Singapore&apos;s foreign-born unicorn founders are from elsewhere in ASEAN</p>
        <p className="mt-3 text-[12px] text-ink-3">The region rarely builds across its own borders.</p>
      </Box>

      {/* 4 · barriers */}
      <Box source="ERIA–ATLAS white paper on ASEAN startups">
        <p className="font-mono text-[40px] font-semibold leading-none">4</p>
        <p className="mt-3 text-[14px] leading-snug text-ink-2">barriers that keep coming back</p>
        <ul className="mt-5 space-y-2">
          {[
            ["Different rules per country", "#d0103a"],
            ["Hard market entry", "#e9a41c"],
            ["Partner mismatch", "#0e9f9a"],
            ["Funding gaps", "#0033a0"],
          ].map(([t, c], i) => (
            <li
              key={t}
              className="flex items-center gap-2.5 text-[13px] text-ink-2 transition-all duration-500"
              style={{ opacity: seen ? 1 : 0, transform: seen ? "none" : "translateX(-8px)", transitionDelay: `${i * 120}ms` }}
            >
              <span className="h-2.5 w-6 rounded-full" style={{ background: c }} />
              {t}
            </li>
          ))}
        </ul>
      </Box>
    </div>
  );
}

function Box({ children, source }: { children: React.ReactNode; source: string }) {
  return (
    <article className="box box-lift flex flex-col p-6">
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
      <circle cx="40" cy="40" r={r} fill="none" stroke="#edf1f7" strokeWidth="10" />
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        stroke="#d0103a"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value)}
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)" }}
      />
    </svg>
  );
}
