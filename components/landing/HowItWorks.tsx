"use client";

import { useEffect, useMemo, useState } from "react";

import { Icon } from "@/components/Icon";
import { useI18n } from "@/lib/i18n";
import { matchOne } from "@/lib/match";
import { OPPORTUNITIES } from "@/lib/opportunities";
import { COUNTRIES, COUNTRY_CODES, STAGES, STAGE_LABEL, type Profile, type Stage } from "@/lib/types";
import { cn } from "@/lib/utils";

/** How it works, shown rather than told: five steps, each with a small live preview. */

const STEPS = [
  ["how.s1t", "how.s1l"],
  ["how.s2t", "how.s2l"],
  ["how.s3t", "how.s3l"],
  ["how.s4t", "how.s4l"],
  ["how.s5t", "how.s5l"],
] as const;

export function HowItWorks() {
  const { t } = useI18n();
  const [step, setStep] = useState(2);
  const [stage, setStage] = useState<Stage>("seed");

  // Real rules over the real dataset: what a Malaysian company could apply to today.
  const open = useMemo(() => {
    const p: Profile = { id: "x", name: "Demo", oneLiner: "", country: "MY", sectors: ["ai"], stage, teamSize: 5, source: "form" };
    const r = { needs: [], targetMarkets: [] };
    const res = OPPORTUNITIES.map((o) => matchOne(p, r, o));
    const byCountry = Object.fromEntries(COUNTRY_CODES.map((c) => [c, res.filter((m) => m.opp.country === c && m.verdict !== "no").length]));
    return { total: res.filter((m) => m.verdict !== "no").length, byCountry };
  }, [stage]);

  return (
    <div className="mt-10 space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
        <ol className="space-y-2">
          {STEPS.map(([title, line], i) => (
            <li key={title}>
              <button
                onClick={() => setStep(i)}
                aria-pressed={step === i}
                className={cn(
                  "nx-focus relative flex w-full items-center gap-4 overflow-hidden rounded-xl border bg-card px-4 py-3 text-left transition-all",
                  step === i ? "border-saffron shadow-[0_14px_30px_-20px_rgb(0_0_0/45%)] ring-1 ring-saffron" : "border-line-strong/50 hover:border-ink",
                )}
              >
                {step === i ? <span className="absolute inset-y-0 left-0 w-1.5 bg-saffron" /> : null}
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-full font-mono text-[12px]", step === i ? "bg-saffron text-saffron-deep" : "bg-stone text-ink-3")}>
                  0{i + 1}
                </span>
                <span>
                  <span className="block text-[15px] font-medium">{t(title)}</span>
                  <span className="block text-[12.5px] text-ink-3">{t(line)}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>

        <div className="nx-dotgrid relative min-h-[360px] overflow-hidden rounded-2xl border border-line-strong/50 bg-card p-6 shadow-[0_14px_34px_-24px_rgb(0_0_0/45%)]">
          <div key={step} className="nx-rise">
            {step === 0 ? <PreviewSetup /> : null}
            {step === 1 ? <PreviewNeed /> : null}
            {step === 2 ? <PreviewMatches /> : null}
            {step === 3 ? <PreviewPathway /> : null}
            {step === 4 ? <PreviewLanguages /> : null}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-line-strong/50 bg-card p-6 shadow-[0_14px_34px_-24px_rgb(0_0_0/45%)]">
        <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_auto]">
          <div>
            <p className="nx-micro text-ink-3">{t("how.rules")}</p>
            <p className="mt-1 text-[15px] text-ink-2">{t("how.rulesSub")}</p>
          </div>
          <div className="inline-flex flex-wrap rounded-lg border border-line bg-paper p-0.5">
            {STAGES.map((s) => (
              <button
                key={s}
                onClick={() => setStage(s)}
                className={cn(
                  "nx-focus inline-flex h-9 items-center rounded-md px-3 text-[13px] transition-colors",
                  s === stage ? "bg-card text-ink shadow-[0_2px_8px_-3px_rgb(0_0_0/30%)]" : "text-ink-2 hover:text-ink",
                )}
              >
                {STAGE_LABEL[s]}
              </button>
            ))}
          </div>
          <p className="font-mono text-[40px] leading-none text-asean">
            {open.total}
            <span className="ml-2 text-[13px] text-ink-3">
              / {OPPORTUNITIES.length} {t("how.open")}
            </span>
          </p>
        </div>
        <div className="mt-5 grid grid-cols-11 gap-1.5">
          {COUNTRY_CODES.map((c) => {
            const n = open.byCountry[c] ?? 0;
            return (
              <div key={c} className="flex flex-col items-center gap-1.5" title={`${COUNTRIES[c].name}: ${n}`}>
                <div className="relative h-16 w-full overflow-hidden rounded-md bg-stone">
                  <span className="absolute inset-x-0 bottom-0 rounded-md bg-asean transition-all duration-700 ease-out" style={{ height: `${Math.min(100, n * 25)}%` }} />
                </div>
                <span className="text-[15px] leading-none">{COUNTRIES[c].flag}</span>
                <span className="font-mono text-[11px] text-ink-3">{n}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="nx-micro mb-4 text-ink-3">{children}</p>;
}

function PreviewSetup() {
  const { t } = useI18n();
  const ways = [
    { icon: "flag", title: t("start.tab.sample"), line: "KrackedDevs", color: "#22d41b" },
    { icon: "upload", title: t("start.tab.upload"), line: "PDF · PPTX · DOCX", color: "#0033a0" },
    { icon: "edit", title: t("start.tab.form"), line: "2 min", color: "#d0103a" },
  ] as const;
  return (
    <div>
      <Label>{t("how.p1")}</Label>
      <div className="grid gap-3 sm:grid-cols-3">
        {ways.map((w, i) => (
          <div key={w.title} className="nx-rise rounded-xl border border-line bg-card p-4" style={{ ["--i" as string]: i * 2 }}>
            <span className="grid size-10 place-items-center rounded-lg text-white" style={{ background: w.color }}>
              <Icon name={w.icon} size={18} />
            </span>
            <p className="mt-3 text-[14.5px] font-medium">{w.title}</p>
            <p className="mt-0.5 font-mono text-[11.5px] text-ink-3">{w.line}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewNeed() {
  const { t } = useI18n();
  const chips = ["Funding", "Pilot partner", "Market entry", "Cloud credits"];
  return (
    <div>
      <Label>{t("how.p2")}</Label>
      <div className="flex items-center gap-3 rounded-lg border border-line bg-card px-3 py-2.5">
        <span className="grid size-9 place-items-center rounded-md bg-asean-red font-mono text-[10px] font-semibold text-white">PPTX</span>
        <span className="flex-1 text-[14px]">kd-labs-regional.pptx</span>
        <Icon name="check" size={16} className="text-good" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {chips.map((c, i) => (
          <span key={c} className="nx-rise inline-flex h-9 items-center gap-2 rounded-full border border-ink bg-card px-4 text-[14px]" style={{ ["--i" as string]: i * 2 }}>
            <span className="size-2 rounded-full bg-good" />
            {c}
          </span>
        ))}
      </div>
      <div className="mt-4 flex gap-2 text-[22px]">
        <span>🇸🇬</span>
        <span>🇮🇩</span>
        <span>🇻🇳</span>
      </div>
    </div>
  );
}

function PreviewMatches() {
  const { t } = useI18n();
  const rows: [string, string, number, number, number][] = [
    ["Google for Startups Accelerator", "🇸🇬", 35, 18, 20],
    ["IMDA Open Innovation Platform", "🇸🇬", 35, 36, 20],
    ["Indigo by Telkom Indonesia", "🇮🇩", 35, 18, 20],
  ];
  return (
    <div>
      <Label>{t("how.p3")}</Label>
      <ul className="space-y-3">
        {rows.map(([name, flag, sector, needs, market], i) => (
          <li key={name} className="nx-rise rounded-lg border border-line bg-card p-3" style={{ ["--i" as string]: i * 2 }}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[15px] font-medium">
                <span className="mr-2 font-mono text-[12px] text-ink-3">#{i + 1}</span>
                {flag} {name}
              </span>
              <span className="font-mono text-[22px] text-good">{Math.min(98, 15 + sector + needs + market)}</span>
            </div>
            <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-stone">
              <span className="nx-grow bg-asean" style={{ width: `${sector}%` }} />
              <span className="nx-grow bg-saffron" style={{ width: `${needs}%` }} />
              <span className="nx-grow bg-asean-red" style={{ width: `${market}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PreviewPathway() {
  const { t } = useI18n();
  const steps: [string, string][] = [
    ["Wk 1", "Check eligibility and the brief"],
    ["Wk 1–2", "Shape the pitch around AI"],
    ["Wk 2", "Line up two reference partners"],
    ["Wk 3", "Submit before 24 Nov"],
  ];
  return (
    <div>
      <Label>{t("how.p4")}</Label>
      <ol className="relative space-y-3 border-l-2 border-dashed border-line-strong pl-5">
        {steps.map(([week, step], i) => (
          <li key={step} className="nx-rise relative" style={{ ["--i" as string]: i * 2 }}>
            <span
              className="absolute top-2.5 -left-[29px] size-5 rounded-full border-[3px] border-white shadow-[0_0_0_1.5px_var(--line-strong)]"
              style={{ background: ["#0033a0", "#ffc300", "#d0103a", "#0e7a4b"][i] }}
            />
            <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-card px-3 py-2.5">
              <span className="text-[14px] font-medium">{step}</span>
              <span className="shrink-0 font-mono text-[12px] text-ink-3">{week}</span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

const SAYINGS = [
  ["🇬🇧", "Apply to IMDA first: it closes soonest and fits best."],
  ["🇲🇾", "Mohon IMDA dahulu: ia tutup paling awal dan paling sesuai."],
  ["🇮🇩", "Daftar IMDA dulu: paling cepat tutup dan paling cocok."],
  ["🇸🇬", "先申请 IMDA：最快截止，也最适合。"],
  ["🇹🇭", "สมัคร IMDA ก่อน: ปิดรับเร็วที่สุดและเหมาะที่สุด"],
  ["🇻🇳", "Nộp IMDA trước: hạn sớm nhất và phù hợp nhất."],
];

function PreviewLanguages() {
  const { t } = useI18n();
  const [n, setN] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setN((v) => (v >= SAYINGS.length ? v : v + 1)), 450);
    return () => clearInterval(id);
  }, []);
  return (
    <div>
      <Label>{t("how.p5")}</Label>
      <ul className="space-y-2">
        {SAYINGS.slice(0, n).map(([flag, text]) => (
          <li key={flag} className="nx-rise flex items-center gap-3 rounded-lg border border-line bg-card px-3 py-2.5">
            <span className="text-[18px]">{flag}</span>
            <span className="text-[14px]">{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
