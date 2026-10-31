"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { LogoLink, NexaLogo } from "@/components/Brand";
import { BTN_OUTLINE, BTN_SAFFRON, LanguageMenu } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { matchAll } from "@/lib/match";
import { OPPORTUNITIES } from "@/lib/opportunities";
import { BUDI, KD_PROFILE, KD_REQUEST, LINH, MEDORA } from "@/lib/samples";
import { getSession, loadProfile } from "@/lib/store";
import { COUNTRIES, COUNTRY_CODES } from "@/lib/types";
import { cn } from "@/lib/utils";

import { KipayLogo, MedoraLogo, PadiGuardLogo } from "./CompanyLogos";
import { HowItWorks } from "./HowItWorks";
import { PersonaCards, type PersonaCard } from "./PersonaCards";
import { ProblemStats } from "./ProblemStats";

const SHELL = "mx-auto w-full max-w-[1120px] px-5 md:px-8";
const H2 = "mt-3 max-w-3xl text-[clamp(1.7rem,3.4vw,2.6rem)] leading-tight font-medium tracking-[-0.02em]";
export const REPO = "https://github.com/eyahia1712/Nexa-Hacktober";

/** Where "See my opportunities" goes: the dashboard if signed in, otherwise login. */
function useCtaHref() {
  const [href, setHref] = useState("/login");
  useEffect(() => {
    // Only a signed-in company with a profile skips the start options.
    const s = getSession();
    if (s && !s.guest && loadProfile(s.email)) setHref("/dashboard");
  }, []);
  return href;
}

export function Landing() {
  return (
    <div id="top" className="min-h-dvh overflow-x-clip bg-paper text-ink">
      <Nav />
      <Hero />
      <Problem />
      <People />
      <How />
      <Evidence />
      <Faq />
      <Footer />
    </div>
  );
}

function Nav() {
  const { t } = useI18n();
  const href = useCtaHref();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className={cn(SHELL, "flex items-center gap-x-6 gap-y-2 py-3")}>
        <LogoLink size={26} />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Sections">
          {(
            [
              ["#problem", "nav.problem"],
              ["#who", "nav.who"],
              ["#how", "nav.how"],
              ["#evidence", "nav.evidence"],
              ["#faq", "nav.faq"],
            ] as const
          ).map(([to, key]) => (
            <a key={to} href={to} className="nx-micro nx-focus inline-flex min-h-9 items-center px-3 text-ink-2 transition-colors hover:text-ink">
              {t(key)}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/events" className="nx-micro nx-focus inline-flex min-h-9 items-center px-3 text-ink-2 transition-colors hover:text-ink">
            Events
          </Link>
          <LanguageMenu />
          <Link href={href} className={cn(BTN_SAFFRON, "hidden min-h-9 sm:inline-flex")}>
            {t("nav.cta")}
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const { t } = useI18n();
  const href = useCtaHref();
  return (
    <section className="relative">
      <div className={cn(SHELL, "pt-12 pb-12 md:pt-16")}>
        <NexaLogo size={64} className="-ml-0.5" />
        <p className="nx-micro mt-7 text-ink-3">{t("hero.eyebrow")}</p>
        <h1 className="mt-4 max-w-4xl text-[clamp(2.5rem,6vw,4.6rem)] leading-[1.02] font-medium tracking-[-0.03em]">{t("hero.title")}</h1>
        <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-ink-2">{t("hero.sub")}</p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href={href} className={cn(BTN_SAFFRON, "min-h-11 px-5")}>
            {t("hero.cta")}
          </Link>
          <Link href="/start?sample=kd" className={BTN_OUTLINE}>
            {t("hero.sample")}
          </Link>
        </div>
      </div>
      <CountryTicker />
    </section>
  );
}

/** A strip of all 11 member states, in their own words. */
const HELLO: Record<string, string> = {
  MY: "Selamat datang",
  SG: "Welcome · 欢迎 · வணக்கம்",
  ID: "Selamat datang",
  TH: "ยินดีต้อนรับ",
  VN: "Chào mừng",
  PH: "Maligayang pagdating",
  BN: "Selamat datang",
  KH: "សូមស្វាគមន៍",
  LA: "ຍິນດີຕ້ອນຮັບ",
  MM: "ကြိုဆိုပါတယ်",
  TL: "Bemvindu",
};

function CountryTicker() {
  const items = [...COUNTRY_CODES, ...COUNTRY_CODES];
  return (
    <div className="nx-ticker-wrap overflow-hidden border-y border-line bg-card py-4">
      <div className="nx-ticker flex w-max gap-3">
        {items.map((c, i) => (
          <span key={i} className="inline-flex items-center gap-3 rounded-full border border-line bg-paper py-1.5 pr-4 pl-1.5" aria-hidden={i >= COUNTRY_CODES.length}>
            <span className="grid size-8 place-items-center rounded-full bg-card text-[18px] shadow-[0_2px_6px_-2px_rgb(0_0_0/25%)]">{COUNTRIES[c].flag}</span>
            <span className="text-[14px] font-medium">{COUNTRIES[c].name}</span>
            <span className="text-[13px] text-ink-3">{HELLO[c]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Problem() {
  const { t } = useI18n();
  return (
    <section id="problem" className="scroll-mt-20 border-b border-line bg-paper-2 py-16 md:py-24">
      <div className={SHELL}>
        <p className="nx-micro text-ink-3">{t("problem.eyebrow")}</p>
        <h2 className="mt-3 max-w-2xl text-[clamp(1.5rem,2.6vw,2rem)] leading-tight font-medium tracking-[-0.02em]">{t("problem.title")}</h2>
        <ProblemStats />
      </div>
    </section>
  );
}

function People() {
  const { t } = useI18n();
  // The answers come from the same rules the dashboard uses.
  const cards = useMemo<PersonaCard[]>(() => {
    const kd = matchAll(KD_PROFILE, KD_REQUEST, OPPORTUNITIES);
    const budi = matchAll(BUDI.profile, BUDI.request, OPPORTUNITIES);
    const linh = matchAll(LINH.profile, LINH.request, OPPORTUNITIES);
    const med = matchAll(MEDORA.profile, MEDORA.request, OPPORTUNITIES);
    const strong = (m: typeof kd) => m.filter((x) => x.verdict === "strong").length;
    const company = (id: string, name: string, tag: string, situation: string, m: typeof kd, route: string, logo: React.ReactNode, color: string): PersonaCard => ({
      id,
      name,
      tag,
      situation,
      answer: m[0]!.opp.name,
      chips: [t("who.strong", { n: strong(m) }), route],
      score: { value: String(m[0]!.score), label: t("who.match") },
      logo,
      color,
    });
    return [
      {
        id: "kd",
        name: "KrackedDevs",
        tag: t("who.kd.tag"),
        situation: t("who.kd.situation"),
        answer: kd[0]!.opp.name,
        chips: [t("who.strong", { n: strong(kd) }), t("who.markets", { n: KD_REQUEST.targetMarkets.length })],
        score: { value: String(kd[0]!.score), label: t("who.match") },
        photo: "/kd/banner.jpg",
        color: "#050a05",
      },
      company("padiguard", "PadiGuard", t("who.budi.tag"), t("who.budi.situation"), budi, "ID → MY · VN", <PadiGuardLogo size={60} />, "linear-gradient(160deg,#13995e,#05361f)"),
      company("kipay", "Kipay", t("who.linh.tag"), t("who.linh.situation"), linh, "VN → TH · PH", <KipayLogo size={60} />, "linear-gradient(160deg,#6366f1,#1e1b4b)"),
      company("medora", "Medora", t("who.med.tag"), t("who.med.situation"), med, "SG → MY · TH", <MedoraLogo size={60} />, "linear-gradient(160deg,#f43f5e,#4c0519)"),
    ];
  }, [t]);

  return (
    <section id="who" className="scroll-mt-20 py-16 md:py-24">
      <div className={SHELL}>
        <p className="nx-micro text-ink-3">{t("who.eyebrow")}</p>
        <h2 className={H2}>
          {t("who.title")} <span className="bg-saffron px-1.5 [box-decoration-break:clone]">{t("who.quote")}</span>
        </h2>
        <PersonaCards cards={cards} />
      </div>
    </section>
  );
}

function How() {
  const { t } = useI18n();
  return (
    <section id="how" className="scroll-mt-20 border-y border-line bg-paper-2 py-16 md:py-24">
      <div className={SHELL}>
        <p className="nx-micro text-ink-3">{t("how.eyebrow")}</p>
        <h2 className={H2}>{t("how.title")}</h2>
        <HowItWorks />
      </div>
    </section>
  );
}

const SOURCES = [
  { name: "Startup ASEAN", key: "src.1", url: "https://startup-asean.org" },
  { name: "ASEAN Secretariat", key: "src.2", url: "https://asean.org" },
  { name: "ERIA", key: "src.3", url: "https://www.eria.org" },
  { name: "Nikkei Asia", key: "src.4", url: "https://asia.nikkei.com" },
  { name: "Gemma 4", key: "src.5", url: "https://ai.google.dev/gemma" },
  { name: "KrackedDevs", key: "src.6", url: "https://krackeddevs.com" },
] as const;

function Evidence() {
  const { t } = useI18n();
  return (
    <section id="evidence" className="scroll-mt-20 py-16 md:py-20">
      <div className={SHELL}>
        <p className="nx-micro text-ink-3">{t("evidence.eyebrow")}</p>
        <h2 className="mt-3 max-w-3xl text-[clamp(1.5rem,2.6vw,2rem)] leading-tight font-medium tracking-[-0.02em]">{t("evidence.title")}</h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SOURCES.map((s) => (
            <a key={s.name} href={s.url} target="_blank" rel="noreferrer" className="nx-card nx-lift nx-focus group flex flex-col p-4">
              <p className="text-[15px] font-medium">{s.name}</p>
              <p className="mt-1 flex-1 text-[13px] text-ink-2">{t(s.key)}</p>
              <p className="mt-3 inline-flex items-center gap-1.5 truncate font-mono text-[11.5px] text-asean group-hover:underline">
                {s.url.replace(/^https?:\/\/(www\.)?/, "")}
                <svg viewBox="0 0 16 16" className="size-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M6 3h7v7M13 3 5 11" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const { t } = useI18n();
  return (
    <section id="faq" className="scroll-mt-20 border-t border-line bg-paper-2 py-16 md:py-24">
      <div className={SHELL}>
        <p className="nx-micro text-ink-3">{t("faq.eyebrow")}</p>
        <h2 className="mt-3 text-[clamp(1.7rem,3.4vw,2.6rem)] leading-tight font-medium tracking-[-0.02em]">{t("faq.title")}</h2>
        <div className="mt-8 divide-y divide-line rounded-xl border border-line bg-paper">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <details key={n} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-medium">
                {t(`faq.q${n}`)}
                <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line font-mono text-[14px] transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-3xl text-[14.5px] leading-relaxed text-ink-2">{t(`faq.a${n}`)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const { t } = useI18n();
  const LINK = "transition-opacity hover:opacity-70";
  return (
    <footer className="nx-footer-ground relative isolate overflow-hidden text-[#f3f3f3]">
      <div className="relative z-10 px-5 pt-28 md:px-8">
        <div className="mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-12 lg:gap-7">
          <div className="relative grid gap-9 lg:col-span-5">
            <span aria-hidden className="absolute -top-5 left-0 block size-1.5 bg-[#f3f3f3]/70" />
            <div>
              <p className="nx-micro text-[#f3f3f3]/50">{t("footer.builtBy")}</p>
              <p className="mt-3 text-[clamp(1.7rem,3vw,2.3rem)] leading-none font-medium tracking-[-0.02em]">{t("footer.team")}</p>
            </div>
            <div>
              <p className="nx-micro text-[#f3f3f3]/50">{t("footer.builtFor")}</p>
              <p className="mt-3 text-[clamp(1.7rem,3vw,2.3rem)] leading-none font-medium tracking-[-0.02em]">{t("footer.event")}</p>
              <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-[#f3f3f3]/60">{t("footer.eventSub")}</p>
            </div>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:col-span-6 lg:col-start-7 lg:grid-cols-3">
            <div>
              <h2 className="nx-micro text-[#f3f3f3]/55">{t("footer.nav")}</h2>
              <ul className="mt-4 space-y-2.5 text-[16px] leading-snug font-medium">
                <li>
                  <Link href="/" className={LINK}>
                    {t("footer.home")}
                  </Link>
                </li>
                <li>
                  <Link href="/login" className={LINK}>
                    {t("nav.cta")}
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className={LINK}>
                    {t("nav.dashboard")}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="nx-micro text-[#f3f3f3]/55">{t("footer.res")}</h2>
              <ul className="mt-4 space-y-2.5 text-[16px] leading-snug font-medium">
                <li>
                  <a href={REPO} target="_blank" rel="noreferrer" className={LINK}>
                    {t("footer.repo")}
                  </a>
                </li>
                <li>
                  <a href="https://startup-asean.org" target="_blank" rel="noreferrer" className={LINK}>
                    Startup ASEAN
                  </a>
                </li>
                <li>
                  <a href="https://krackeddevs.com" target="_blank" rel="noreferrer" className={LINK}>
                    KrackedDevs
                  </a>
                </li>
              </ul>
            </div>
            <div className="flex items-start sm:justify-end">
              <a href="#top" className="group flex items-center gap-3" aria-label={t("footer.top")}>
                <span className="nx-micro text-[#f3f3f3]/70">{t("footer.top")}</span>
                <span className="grid size-[34px] place-items-center bg-white/10 transition-colors group-hover:bg-white group-hover:text-[#04122b]">
                  <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M8 13V3M8 3L3.5 7.5M8 3l4.5 4.5" />
                  </svg>
                </span>
              </a>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-16 w-full max-w-7xl border-t border-white/12">
          <div className="flex flex-wrap items-center justify-between gap-4 py-5">
            <p className="nx-micro text-[#f3f3f3]/55">{t("footer.tag")}</p>
            <p className="text-[12px] tracking-[0.04em] text-[#f3f3f3]/45">© 2026 Team Nexa · Hacktoberfest KL</p>
          </div>
        </div>
      </div>

      <div className="relative mt-2 h-[13vw] min-h-[56px] overflow-hidden">
        <p
          aria-hidden
          className="-mt-[0.05em] text-center text-[19vw] leading-[0.78] font-extrabold tracking-[-0.045em] whitespace-nowrap text-[#f3f3f3] italic"
          style={{ fontFamily: "var(--font-logo), var(--font-sans), sans-serif" }}
        >
          Nexa
        </p>
      </div>
    </footer>
  );
}
