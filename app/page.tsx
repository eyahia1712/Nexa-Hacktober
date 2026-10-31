import Link from "next/link";
import { Logo, Wordmark } from "@/components/Brand";
import { Icon, ScoreRing } from "@/components/Icon";
import { ProblemStats } from "@/components/landing/ProblemStats";
import { Scene } from "@/components/landing/Scene";
import { matchAll } from "@/lib/match";
import { OPPORTUNITIES } from "@/lib/opportunities";
import { COUNTRIES, COUNTRY_CODES, type Profile } from "@/lib/types";

const SHELL = "mx-auto w-full max-w-[1120px] px-5 md:px-8";
const H2 = "mt-3 max-w-3xl text-[clamp(1.7rem,3.4vw,2.6rem)] font-semibold leading-tight tracking-[-0.025em]";

// Personas run through the same matching engine the app uses.
const BUDI: Profile = {
  name: "PadiGuard", oneLiner: "", country: "ID", sector: "agritech", stage: "pre-seed", teamSize: 2,
  needs: ["funding", "mentorship", "pilot-partner"], targetMarkets: ["MY", "VN"],
};
const LINH: Profile = {
  name: "Ví Xanh", oneLiner: "", country: "VN", sector: "fintech", stage: "seed", teamSize: 6,
  needs: ["funding", "pilot-partner"], targetMarkets: ["TH", "SG"],
};
const top = (p: Profile) => matchAll(p, OPPORTUNITIES)[0];
const strongCount = (p: Profile) => matchAll(p, OPPORTUNITIES).filter((m) => m.verdict === "strong").length;

export default function Home() {
  return (
    <div className="min-h-dvh overflow-x-clip bg-white text-ink">
      <Nav />
      <Hero />
      <Problem />
      <People />
      <How />
      <TwoViews />
      <Cta />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
      <div className={`${SHELL} flex items-center gap-6 py-3`}>
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {[
            ["#problem", "The problem"],
            ["#who", "Who it's for"],
            ["#how", "How it works"],
            ["#views", "Two views"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="micro px-3 py-2 text-ink-2 transition-colors hover:text-ink">
              {label}
            </a>
          ))}
        </nav>
        <Link href="/app" className="btn btn-blue ml-auto min-h-9 text-[13px]">
          Find my opportunities
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section>
      <div className={`${SHELL} pb-10 pt-12 md:pt-16`}>
        <Wordmark size={60} />
        <p className="micro mt-7 text-ink-3">Startup ASEAN · Ecosystem gateway · Built on Gemma 4</p>
        <h1 className="mt-4 max-w-4xl text-[clamp(2.6rem,6.2vw,4.8rem)] font-semibold leading-[1] tracking-[-0.035em]">
          Ten countries. <span className="text-blue">One door.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-ink-2">
          Upload your pitch deck. Nexa finds every ASEAN grant, programme, investor and partner you qualify for.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/app" className="btn btn-blue">
            Find my opportunities <Icon name="arrow" size={16} />
          </Link>
          <Link href="/app?sample=1" className="btn btn-line">
            Try the sample deck
          </Link>
        </div>
        <p className="mt-5 font-mono text-[12.5px] text-ink-3">
          {OPPORTUNITIES.length} opportunities · {COUNTRY_CODES.length} countries · 4 languages
        </p>
      </div>
      <Scene className="h-[min(39vw,560px)] min-h-[320px] border-y border-line" />
    </section>
  );
}

function Problem() {
  return (
    <section id="problem" className="scroll-mt-20 border-b border-line bg-paper-2 py-16 md:py-24">
      <div className={SHELL}>
        <p className="micro text-ink-3">The problem</p>
        <h2 className={H2}>The help exists in every ASEAN country. Founders just can&apos;t find it, or tell if they qualify.</h2>
        <ProblemStats />
      </div>
    </section>
  );
}

function People() {
  const b = top(BUDI);
  const l = top(LINH);
  const cards = [
    {
      initial: "B", color: "#0033a0", name: "Budi, 26", tag: "Founder", where: `${COUNTRIES.ID.flag} Bandung · agritech`,
      answer: b.opp.name, chips: [`${strongCount(BUDI)} strong fits`, "pre-seed"], score: String(b.score), label: "Top fit",
    },
    {
      initial: "L", color: "#0e9f9a", name: "Linh, 31", tag: "Founder", where: `${COUNTRIES.VN.flag} Ho Chi Minh · fintech`,
      answer: l.opp.name, chips: [`${strongCount(LINH)} strong fits`, "seed"], score: String(l.score), label: "Top fit",
    },
    {
      initial: "P", color: "#e9a41c", name: "Programme lead", tag: "Accelerator", where: "Needs the right cohort",
      answer: "Founders who already qualify", chips: ["eligibility ✓", "no spam"], score: "10", label: "Countries",
    },
    {
      initial: "SA", color: "#d0103a", name: "Startup ASEAN", tag: "Gateway team", where: "Must prove outcomes",
      answer: "Match → deal dashboard", chips: ["by country", "by sector"], score: "4", label: "Stages",
    },
  ];
  return (
    <section id="who" className="scroll-mt-20 py-16 md:py-24">
      <div className={SHELL}>
        <p className="micro text-ink-3">Who it&apos;s for</p>
        <h2 className={H2}>
          Built for the moment a founder asks: <span className="bg-blue px-2 text-white [box-decoration-break:clone]">“Where do I even start?”</span>
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <article key={c.name} className="box box-lift flex flex-col p-5">
              <div className="flex items-start justify-between">
                <span className="grid size-12 place-items-center rounded-full text-[15px] font-bold text-white" style={{ background: c.color }}>
                  {c.initial}
                </span>
                <div className="text-right">
                  <p className="font-mono text-[24px] font-semibold leading-none" style={{ color: c.color }}>{c.score}</p>
                  <p className="mt-1 text-[10.5px] text-ink-3">{c.label}</p>
                </div>
              </div>
              <p className="mt-4 text-[16px] font-semibold">{c.name}</p>
              <p className="micro mt-0.5 text-ink-3">{c.tag}</p>
              <p className="mt-3 text-[13px] text-ink-2">{c.where}</p>
              <div className="mt-3 flex items-start gap-2 border-t border-line pt-3">
                <Icon name="arrow" size={15} className="mt-0.5 text-ink-3" />
                <p className="text-[14px] font-semibold leading-snug">{c.answer}</p>
              </div>
              <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                {c.chips.map((x) => (
                  <span key={x} className="rounded-full border border-line px-2.5 py-1 text-[11.5px] text-ink-2">{x}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function How() {
  return (
    <section id="how" className="scroll-mt-20 border-y border-line bg-paper-2 py-16 md:py-24">
      <div className={SHELL}>
        <p className="micro text-ink-3">How it works</p>
        <h2 className={H2}>Gemma 4 reads. Rules decide. You act.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {/* Read */}
          <article className="box box-lift p-6">
            <Step n="01" title="Read your deck" color="#0033a0" />
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-line bg-paper-2 p-4">
              <div className="grid h-16 w-12 shrink-0 place-items-center rounded-md border border-line-strong bg-white">
                <Icon name="doc" size={22} className="text-blue" />
              </div>
              <Icon name="arrow" size={16} className="text-ink-3" />
              <div className="flex flex-wrap gap-1.5">
                {[`${COUNTRIES.ID.flag} Indonesia`, "Agritech", "Pre-seed", "Needs pilot"].map((c) => (
                  <span key={c} className="rounded-full bg-blue-soft px-2.5 py-1 text-[11.5px] font-semibold text-blue">{c}</span>
                ))}
              </div>
            </div>
          </article>
          {/* Match */}
          <article className="box box-lift p-6">
            <Step n="02" title="Check every rule" color="#0e9f9a" />
            <ul className="mt-5 space-y-2 rounded-xl border border-line bg-paper-2 p-4 text-[13px]">
              {[
                ["Stage", true],
                ["Country", true],
                ["Sector", true],
                ["Deadline", false],
              ].map(([t, ok]) => (
                <li key={String(t)} className="flex items-center justify-between">
                  <span className="text-ink-2">{t}</span>
                  <span className={`grid size-6 place-items-center rounded-full ${ok ? "bg-teal-soft text-teal" : "bg-red-soft text-red"}`}>
                    <Icon name={ok ? "check" : "x"} size={13} stroke={2.6} />
                  </span>
                </li>
              ))}
            </ul>
          </article>
          {/* Act */}
          <article className="box box-lift p-6">
            <Step n="03" title="Act and track" color="#d0103a" />
            <div className="mt-5 space-y-2.5 rounded-xl border border-line bg-paper-2 p-4">
              {[
                ["Saved", 100, "#9fc3e6"],
                ["Applied", 64, "#2f5bd3"],
                ["Meeting", 38, "#e9a41c"],
                ["Deal", 18, "#0e9f9a"],
              ].map(([t, w, c]) => (
                <div key={String(t)} className="flex items-center gap-3">
                  <span className="w-14 text-[11.5px] text-ink-2">{t}</span>
                  <span className="h-3 flex-1 overflow-hidden rounded-full bg-stone">
                    <span className="block h-full rounded-full" style={{ width: `${w}%`, background: String(c) }} />
                  </span>
                </div>
              ))}
            </div>
          </article>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["image", "Poster → opportunity"],
            ["globe", "Bahasa · ไทย · Tiếng Việt"],
            ["mail", "One-click intro"],
            ["flag", "Every source linked"],
          ].map(([icon, t]) => (
            <div key={t} className="box flex items-center gap-3 px-5 py-4">
              <span className="grid size-9 place-items-center rounded-lg bg-blue-soft text-blue">
                <Icon name={icon as "image"} size={18} />
              </span>
              <span className="text-[14px] font-semibold">{t}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Step({ n, title, color }: { n: string; title: string; color: string }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="h-2.5 w-9 rounded-full" style={{ background: color }} />
        <span className="font-mono text-[12px] text-ink-3">{n}</span>
      </div>
      <h3 className="mt-4 text-[21px] font-semibold tracking-tight">{title}</h3>
    </div>
  );
}

function TwoViews() {
  const matches = matchAll(BUDI, OPPORTUNITIES).slice(0, 3);
  const bars = [
    ["MY", 42, 9], ["SG", 38, 7], ["ID", 31, 6], ["VN", 24, 4], ["TH", 18, 3],
  ] as const;
  return (
    <section id="views" className="scroll-mt-20 py-16 md:py-24">
      <div className={SHELL}>
        <p className="micro text-ink-3">Two views, one engine</p>
        <h2 className={H2}>For the founder searching, and for Startup ASEAN measuring.</h2>
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <article className="box flex flex-col p-6">
            <p className="micro text-ink-3">Founder view</p>
            <h3 className="mt-2 text-[22px] font-semibold leading-snug">My matches, ranked and explained</h3>
            <div className="mt-5 space-y-2.5">
              {matches.map((m) => (
                <div key={m.opp.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
                  <ScoreRing score={m.score} verdict={m.verdict} size={42} />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold">{m.opp.name}</p>
                    <p className="text-[12px] text-ink-3">{COUNTRIES[m.opp.country].flag} {COUNTRIES[m.opp.country].name} · {m.opp.amount}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/app?sample=1" className="btn btn-blue mt-6 self-start">See a live example</Link>
          </article>

          <article className="box flex flex-col p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="micro text-ink-3">Startup ASEAN view</p>
                <h3 className="mt-2 text-[22px] font-semibold leading-snug">Which connections become deals</h3>
              </div>
              <div className="text-right">
                <p className="font-mono text-[30px] leading-none text-teal">29</p>
                <p className="mt-1 text-[11px] text-ink-3">deals this quarter</p>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {bars.map(([c, matched, deals]) => (
                <div key={c} className="flex items-center gap-3">
                  <span className="w-28 whitespace-nowrap text-[12.5px] text-ink-2">{COUNTRIES[c].flag} {COUNTRIES[c].name}</span>
                  <span className="relative h-3.5 flex-1 overflow-hidden rounded-full bg-stone">
                    <span className="absolute inset-y-0 left-0 rounded-full bg-blue/20" style={{ width: `${matched * 2}%` }} />
                    <span className="absolute inset-y-0 left-0 rounded-full bg-teal" style={{ width: `${deals * 2}%` }} />
                  </span>
                  <span className="w-12 text-right font-mono text-[12px]">{deals}/{matched}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-ink-2">
              <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-blue/20" /> matched</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-teal" /> became a deal</span>
              <span className="text-ink-3">· illustrative</span>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section className="border-t border-line bg-paper-2 py-16 md:py-20">
      <div className={`${SHELL} flex flex-wrap items-center justify-between gap-6`}>
        <h2 className="text-[clamp(1.7rem,3.4vw,2.6rem)] font-semibold tracking-[-0.025em]">
          Stop searching 40 tabs. <span className="text-blue">Open one door.</span>
        </h2>
        <Link href="/app" className="btn btn-blue">
          <Icon name="upload" size={16} /> Upload your deck
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line">
      <div className={`${SHELL} flex flex-wrap items-center justify-between gap-3 py-6 text-[12px] text-ink-3`}>
        <span>Nexa · Hacktoberfest Hack Day KL 2026 · Gemma 4</span>
        <span>Demo data: real organisations, illustrative terms.</span>
      </div>
    </footer>
  );
}
