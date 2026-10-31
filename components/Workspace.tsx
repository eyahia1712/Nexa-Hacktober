"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Logo } from "./Brand";
import { Icon, ScoreRing } from "./Icon";
import { NotificationBell } from "./NotificationBell";
import { getJson, personHeaders, post, sectorLabel, store } from "@/lib/client";
import { matchAll } from "@/lib/match";
import { OPPORTUNITIES } from "@/lib/opportunities";
import {
  COUNTRIES,
  COUNTRY_CODES,
  NEED_LABEL,
  NEEDS,
  SECTORS,
  STAGE_LABEL,
  STAGES,
  TRACK_STAGES,
  TYPE_LABEL,
  type Country,
  type EventRec,
  type EventSummary,
  type Match,
  type Opportunity,
  type OppType,
  type Profile,
  type TrackStage,
} from "@/lib/types";

type FilePart = { mime: string; data: string; name: string };
type Mode = "gemma" | "sample" | "manual";

// ── helpers ──────────────────────────────────────────────────
function readFile(f: File): Promise<FilePart> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve({ mime: f.type || "application/pdf", data: String(r.result).split(",")[1], name: f.name });
    r.onerror = reject;
    r.readAsDataURL(f);
  });
}

function deadline(m: Match) {
  if (m.daysLeft === null) return { text: "Rolling", tone: "text-ink-2 bg-stone" };
  if (m.daysLeft < 0) return { text: "Closed", tone: "text-red bg-red-soft" };
  if (m.daysLeft <= 21) return { text: `${m.daysLeft}d left`, tone: "text-red bg-red-soft" };
  return { text: `${m.daysLeft}d left`, tone: "text-ink-2 bg-stone" };
}

const SHELL = "mx-auto w-full max-w-[1240px] px-4 sm:px-6";

// ── main ─────────────────────────────────────────────────────
export function Workspace({ autoSample }: { autoSample: boolean }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [imported, setImported] = useState<Opportunity[]>([]);
  const [track, setTrack] = useState<Record<string, TrackStage>>({});
  const [tab, setTab] = useState<"matches" | "tracker">("matches");
  const [draftFor, setDraftFor] = useState<Opportunity | null>(null);
  const [posterOpen, setPosterOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    setImported(store.get("nexa.imported", []));
    setTrack(store.get("nexa.track", {}));
    const saved = store.get<Profile | null>("nexa.profile", null);
    if (saved && !autoSample) {
      setProfile(saved);
      setMode(store.get<Mode>("nexa.mode", "gemma"));
    }
  }, [autoSample]);

  const opps = useMemo(() => [...imported, ...OPPORTUNITIES], [imported]);
  const matches = useMemo(() => (profile ? matchAll(profile, opps) : []), [profile, opps]);

  const updateProfile = (p: Profile, m?: Mode) => {
    setProfile(p);
    store.set("nexa.profile", p);
    if (m) {
      setMode(m);
      store.set("nexa.mode", m);
    }
  };
  const updateTrack = (next: Record<string, TrackStage>) => {
    setTrack(next);
    store.set("nexa.track", next);
  };
  const addImported = (o: Opportunity) => {
    const next = [o, ...imported];
    setImported(next);
    store.set("nexa.imported", next);
  };
  const reset = () => {
    setProfile(null);
    setMode(null);
    setTab("matches");
    store.set("nexa.profile", null);
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
        <div className={`${SHELL} flex items-center gap-4 py-3`}>
          <Logo />
          {profile && (
            <nav className="mx-auto flex items-center gap-1 rounded-xl border border-line bg-paper-2 p-1">
              {(["matches", "tracker"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`micro rounded-lg px-4 py-2 transition ${tab === t ? "bg-white text-blue shadow-[0_2px_8px_-4px_rgb(0_0_0/0.3)]" : "text-ink-2 hover:text-ink"}`}
                >
                  {t === "matches" ? "Matches" : `Tracker${Object.keys(track).length ? ` · ${Object.keys(track).length}` : ""}`}
                </button>
              ))}
            </nav>
          )}
          <Link href="/events" className={`micro flex items-center gap-1.5 px-2 py-2 text-ink-2 transition-colors hover:text-blue ${profile ? "" : "ml-auto"}`}>
            <Icon name="calendar" size={15} /> Events
          </Link>
          <Link href="/me" className="micro px-2 py-2 text-ink-2 transition-colors hover:text-blue">Me</Link>
          <NotificationBell />
          {profile ? (
            <button onClick={reset} className="btn btn-line min-h-9 text-[13px]">
              <Icon name="upload" size={15} /> New deck
            </button>
          ) : (
            <span className="micro hidden text-ink-3 sm:block">Gemma 4 · Startup ASEAN</span>
          )}
        </div>
      </header>

      {!profile ? (
        <Intake autoSample={autoSample} onDone={updateProfile} />
      ) : (
        <main className={`${SHELL} space-y-5 py-8`}>
          {mode === "sample" && (
            <div className="box flex items-center gap-3 border-gold/40 bg-gold-soft px-4 py-3 text-[13px] text-ink-2">
              <Icon name="alert" size={16} className="text-gold-deep" /> Sample mode: add <code className="font-mono">GEMINI_API_KEY</code> to
              <code className="font-mono">.env.local</code> for live Gemma 4, or press New deck → Fill in a form to add your own startup.
            </div>
          )}
          <ProfileBanner profile={profile} mode={mode} onEdit={() => setEditOpen(true)} />
          {tab === "matches" ? (
            <>
              <Kpis matches={matches} />
              <div className="grid items-start gap-5 lg:grid-cols-[1fr_340px]">
                <MatchGrid
                  matches={matches}
                  track={track}
                  onTrack={(id) => updateTrack({ ...track, [id]: track[id] ?? "saved" })}
                  onDraft={setDraftFor}
                  onImport={() => setPosterOpen(true)}
                />
                <aside className="space-y-5 lg:sticky lg:top-24">
                  <AskNexa profile={profile} matches={matches} />
                  <EventsForYou profile={profile} />
                  <CountryChart matches={matches} />
                </aside>
              </div>
            </>
          ) : (
            <Tracker matches={matches} track={track} onChange={updateTrack} />
          )}
        </main>
      )}

      {editOpen && profile && <EditModal profile={profile} onChange={(p) => updateProfile(p)} onClose={() => setEditOpen(false)} />}
      {draftFor && profile && <DraftModal profile={profile} opp={draftFor} onClose={() => setDraftFor(null)} />}
      {posterOpen && (
        <PosterModal
          onClose={() => setPosterOpen(false)}
          onAdd={(o) => {
            addImported(o);
            setPosterOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ── Step 1 · intake ──────────────────────────────────────────
const LOADING = ["Reading slides", "Building profile", `Checking ${OPPORTUNITIES.length} opportunities`];

function Intake({ autoSample, onDone }: { autoSample: boolean; onDone: (p: Profile, m: Mode) => void }) {
  const [files, setFiles] = useState<FilePart[]>([]);
  const [text, setText] = useState("");
  const [showText, setShowText] = useState(false);
  const [manual, setManual] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const started = useRef(false);

  const run = useCallback(
    async (body: { text: string; files: FilePart[] }) => {
      setBusy(true);
      setError("");
      setStep(0);
      const t = setInterval(() => setStep((s) => Math.min(s + 1, LOADING.length - 1)), 2300);
      try {
        const res = await post<{ profile: Profile; mode: Mode }>("/api/profile", body);
        onDone(res.profile, res.mode);
      } catch (e) {
        setError((e as Error).message);
        setBusy(false);
      } finally {
        clearInterval(t);
      }
    },
    [onDone],
  );

  const runSample = useCallback(async () => {
    const blob = await (await fetch("/sample-deck.pdf")).blob();
    const f = await readFile(new File([blob], "PadiGuard-deck.pdf", { type: "application/pdf" }));
    setFiles([f]);
    run({ text: "", files: [f] });
  }, [run]);

  useEffect(() => {
    if (autoSample && !started.current) {
      started.current = true;
      runSample();
    }
  }, [autoSample, runSample]);

  const addFiles = async (list: FileList | null) => {
    if (!list) return;
    const ok = [...list].filter((f) => f.type === "application/pdf" || f.type.startsWith("image/")).slice(0, 6);
    setFiles(await Promise.all(ok.map(readFile)));
  };

  return (
    <main className={`${SHELL} grid items-center gap-10 py-14 md:py-20 lg:grid-cols-[1fr_520px]`}>
      <div>
        <p className="micro text-ink-3">Step 1 of 3 · Your startup</p>
        <h1 className="mt-4 text-[clamp(2.2rem,4.6vw,3.6rem)] font-semibold leading-[1.02] tracking-[-0.035em]">
          Show us your deck.
          <br />
          <span className="text-blue">We&apos;ll find your doors.</span>
        </h1>
        <div className="mt-8 grid max-w-md grid-cols-3 gap-3">
          {[
            ["doc", "Read", "#0033a0"],
            ["check", "Match", "#0e9f9a"],
            ["flag", "Track", "#d0103a"],
          ].map(([i, t, c]) => (
            <div key={t} className="box p-4">
              <span className="grid size-9 place-items-center rounded-lg text-white" style={{ background: c }}>
                <Icon name={i as "doc"} size={18} />
              </span>
              <p className="mt-3 text-[14px] font-semibold">{t}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="box p-6 sm:p-8">
        {busy ? (
          <div className="py-6">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-blue-soft text-blue">
                <Icon name="doc" size={22} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold">{files[0]?.name ?? "Your description"}</p>
                <p className="micro text-ink-3">Gemma 4 is reading</p>
              </div>
            </div>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-stone">
              <div className="h-full rounded-full bg-blue transition-[width] duration-[2200ms] ease-out" style={{ width: `${((step + 1) / LOADING.length) * 92}%` }} />
            </div>
            <ul className="mt-6 space-y-3">
              {LOADING.map((s, i) => (
                <li key={s} className={`flex items-center gap-3 text-[14px] font-semibold transition ${i <= step ? "text-ink" : "text-ink-3/60"}`}>
                  <span className={`grid size-6 place-items-center rounded-full ${i < step ? "bg-teal text-white" : i === step ? "bg-blue text-white" : "bg-stone"}`}>
                    {i < step ? <Icon name="check" size={13} stroke={2.8} /> : i === step ? <span className="dot size-1.5 rounded-full bg-white" /> : null}
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        ) : manual ? (
          <ManualProfile onDone={(p) => onDone(p, "manual")} onBack={() => setManual(false)} />
        ) : (
          <>
            <button
              onClick={() => input.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                addFiles(e.dataTransfer.files);
              }}
              className={`flex w-full flex-col items-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition ${
                drag ? "border-blue bg-blue-soft" : "border-line-strong bg-paper-2 hover:border-blue"
              }`}
            >
              <span className="grid size-14 place-items-center rounded-2xl bg-white text-blue shadow-[0_8px_20px_-10px_rgb(0_51_160/0.5)]">
                <Icon name="upload" size={24} />
              </span>
              <span className="mt-4 text-[16px] font-semibold">{files.length ? files.map((f) => f.name).join(", ") : "Drop your pitch deck"}</span>
              <span className="mt-1 font-mono text-[12px] text-ink-3">PDF · PNG · JPG</span>
            </button>
            <input ref={input} type="file" accept="application/pdf,image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />

            {showText ? (
              <textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                placeholder="3-person healthtech in Manila, seed, needs a hospital pilot in Vietnam."
                className="mt-4 w-full rounded-xl border border-line-strong px-4 py-3 text-[14px] outline-none transition placeholder:text-ink-3 focus:border-blue focus:ring-4 focus:ring-blue-soft"
              />
            ) : (
              <button onClick={() => setShowText(true)} className="mt-4 text-[13px] font-semibold text-ink-2 underline-offset-4 hover:text-blue hover:underline">
                No deck? Describe it instead
              </button>
            )}
            <button onClick={() => setManual(true)} className="ml-4 mt-4 text-[13px] font-semibold text-ink-2 underline-offset-4 hover:text-blue hover:underline">
              Fill in a form
            </button>

            {error && <p className="mt-4 rounded-lg bg-red-soft px-4 py-3 text-[13px] font-semibold text-red">{error}</p>}

            <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
              <button disabled={!files.length && !text.trim()} onClick={() => run({ text, files })} className="btn btn-blue">
                Read with Gemma 4 <Icon name="arrow" size={16} />
              </button>
              <button onClick={runSample} className="btn btn-line">
                Sample deck {COUNTRIES.ID.flag}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

/** No deck and no AI key: the founder types the profile in. */
function ManualProfile({ onDone, onBack }: { onDone: (p: Profile) => void; onBack: () => void }) {
  const [p, setP] = useState<Profile>({
    name: "",
    oneLiner: "",
    country: "MY",
    sector: "saas",
    stage: "pre-seed",
    teamSize: 2,
    needs: ["funding"],
    targetMarkets: [],
    ask: "",
  });
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((x) => ({ ...x, [k]: v }));
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const field = "mt-1.5 h-10 w-full rounded-lg border border-line-strong bg-white px-3 text-[14px] font-semibold normal-case tracking-normal text-ink outline-none focus:border-blue";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onDone({ ...p, name: p.name.trim(), oneLiner: p.oneLiner.trim(), ask: p.ask?.trim() || undefined });
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[17px] font-semibold">Your startup</p>
        <button type="button" onClick={onBack} className="micro text-ink-3 hover:text-blue">← Upload instead</button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="micro col-span-2 text-ink-3">
          Name
          <input required value={p.name} onChange={(e) => set("name", e.target.value)} placeholder="PadiGuard" className={field} />
        </label>
        <label className="micro col-span-2 text-ink-3">
          One line on what you build
          <input value={p.oneLiner} onChange={(e) => set("oneLiner", e.target.value)} placeholder="Crop-disease alerts for rice farmers" className={field} />
        </label>
        <label className="micro text-ink-3">
          Based in
          <select className={field} value={p.country} onChange={(e) => set("country", e.target.value as Country)}>
            {COUNTRY_CODES.map((c) => (
              <option key={c} value={c}>{COUNTRIES[c].flag} {COUNTRIES[c].name}</option>
            ))}
          </select>
        </label>
        <label className="micro text-ink-3">
          Sector
          <select className={field} value={p.sector} onChange={(e) => set("sector", e.target.value as Profile["sector"])}>
            {SECTORS.map((s) => (
              <option key={s} value={s}>{sectorLabel(s)}</option>
            ))}
          </select>
        </label>
        <label className="micro text-ink-3">
          Stage
          <select className={field} value={p.stage} onChange={(e) => set("stage", e.target.value as Profile["stage"])}>
            {STAGES.map((s) => (
              <option key={s} value={s}>{STAGE_LABEL[s]}</option>
            ))}
          </select>
        </label>
        <label className="micro text-ink-3">
          Team size
          <input type="number" min={1} value={p.teamSize} onChange={(e) => set("teamSize", Math.max(1, Number(e.target.value) || 1))} className={field} />
        </label>
        <label className="micro col-span-2 text-ink-3">
          Raising
          <input value={p.ask} onChange={(e) => set("ask", e.target.value)} placeholder="US$ 300k pre-seed" className={field} />
        </label>
      </div>
      <p className="micro mt-4 text-ink-3">Needs</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {NEEDS.map((n) => (
          <button
            type="button"
            key={n}
            onClick={() => set("needs", toggle(p.needs, n))}
            className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition ${p.needs.includes(n) ? "border-red bg-red text-white" : "border-line text-ink-2 hover:border-red"}`}
          >
            {NEED_LABEL[n]}
          </button>
        ))}
      </div>
      <p className="micro mt-4 text-ink-3">Expanding to</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {COUNTRY_CODES.filter((c) => c !== p.country).map((c) => (
          <button
            type="button"
            key={c}
            onClick={() => set("targetMarkets", toggle(p.targetMarkets, c))}
            className={`rounded-full border px-2.5 py-1.5 text-[12.5px] font-semibold transition ${p.targetMarkets.includes(c) ? "border-blue bg-blue text-white" : "border-line text-ink-2 hover:border-blue"}`}
          >
            {COUNTRIES[c].flag} {COUNTRIES[c].name}
          </button>
        ))}
      </div>
      <button disabled={!p.name.trim() || !p.needs.length} className="btn btn-blue mt-5 w-full">
        Find my opportunities <Icon name="arrow" size={16} />
      </button>
    </form>
  );
}

// ── Profile banner ───────────────────────────────────────────
function ProfileBanner({ profile: p, mode, onEdit }: { profile: Profile; mode: Mode | null; onEdit: () => void }) {
  return (
    <section className="box rise overflow-hidden">
      <div className="flex flex-wrap items-center gap-5 p-5 sm:p-6">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-blue text-[22px] font-extrabold text-white">
          {p.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[22px] font-semibold tracking-tight">{p.name}</h1>
            <span className="micro inline-flex items-center gap-1 rounded-full bg-teal-soft px-2 py-0.5 text-teal-deep">
              <Icon name="spark" size={12} stroke={2.4} /> {mode === "gemma" ? "Read by Gemma 4" : mode === "manual" ? "Entered by you" : "Sample"}
            </span>
          </div>
          <p className="mt-1 line-clamp-1 text-[14px] text-ink-2">{p.oneLiner}</p>
        </div>
        <button onClick={onEdit} className="btn btn-line min-h-9 text-[13px]">
          <Icon name="edit" size={15} /> Edit
        </button>
      </div>
      <div className="grid grid-cols-2 border-t border-line sm:grid-cols-3 lg:grid-cols-6">
        <Fact label="Based in" value={`${COUNTRIES[p.country].flag} ${COUNTRIES[p.country].name}`} />
        <Fact label="Stage" value={STAGE_LABEL[p.stage]} />
        <Fact label="Sector" value={sectorLabel(p.sector)} />
        <Fact label="Raising" value={p.ask ?? "–"} mono />
        <Fact label="Needs">
          <div className="flex flex-wrap gap-1">
            {p.needs.map((n) => (
              <span key={n} className="rounded-full bg-red-soft px-2 py-0.5 text-[11.5px] font-semibold text-red">{NEED_LABEL[n]}</span>
            ))}
          </div>
        </Fact>
        <Fact label="Expanding to">
          <span className="text-[18px] leading-none tracking-[2px]">{p.targetMarkets.map((c) => COUNTRIES[c].flag).join(" ") || "–"}</span>
        </Fact>
      </div>
    </section>
  );
}

function Fact({ label, value, mono, children }: { label: string; value?: string; mono?: boolean; children?: React.ReactNode }) {
  return (
    <div className="border-b border-r border-line px-5 py-3.5 last:border-r-0">
      <p className="micro text-ink-3">{label}</p>
      <div className={`mt-1 text-[14px] font-semibold ${mono ? "font-mono" : ""}`}>{children ?? value}</div>
    </div>
  );
}

// ── KPI row ──────────────────────────────────────────────────
function Kpis({ matches }: { matches: Match[] }) {
  const strong = matches.filter((m) => m.verdict === "strong");
  const partial = matches.filter((m) => m.verdict === "partial");
  const no = matches.filter((m) => m.verdict === "no");
  const soon = matches.filter((m) => m.verdict !== "no" && m.daysLeft !== null && m.daysLeft >= 0 && m.daysLeft <= 30);
  const countries = new Set(strong.map((m) => m.opp.country)).size;
  const total = matches.length || 1;

  return (
    <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <article className="box p-5">
        <p className="micro text-ink-3">Strong fits</p>
        <p className="mt-2 font-mono text-[36px] font-semibold leading-none text-teal">{strong.length}</p>
        <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-stone">
          <span className="bg-teal" style={{ width: `${(strong.length / total) * 100}%` }} />
          <span className="bg-gold" style={{ width: `${(partial.length / total) * 100}%` }} />
          <span className="bg-red/70" style={{ width: `${(no.length / total) * 100}%` }} />
        </div>
        <p className="mt-2 font-mono text-[11px] text-ink-3">
          {partial.length} partial · {no.length} not yet
        </p>
      </article>
      <article className="box p-5">
        <p className="micro text-ink-3">Best score</p>
        <div className="mt-2 flex items-center gap-3">
          <ScoreRing score={strong[0]?.score ?? 0} verdict={strong.length ? "strong" : "partial"} size={56} />
          <p className="line-clamp-2 text-[13px] font-semibold leading-snug">{strong[0]?.opp.name ?? "–"}</p>
        </div>
      </article>
      <article className="box p-5">
        <p className="micro text-ink-3">Closing in 30 days</p>
        <p className="mt-2 font-mono text-[36px] font-semibold leading-none text-red">{soon.length}</p>
        <div className="mt-4 flex gap-1">
          {Array.from({ length: 30 }, (_, d) => (
            <span key={d} className={`h-5 flex-1 rounded-sm ${soon.some((m) => m.daysLeft === d) ? "bg-red" : "bg-stone"}`} />
          ))}
        </div>
      </article>
      <article className="box p-5">
        <p className="micro text-ink-3">Countries open to you</p>
        <p className="mt-2 font-mono text-[36px] font-semibold leading-none text-blue">
          {countries}
          <span className="text-[16px] text-ink-3">/10</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-0.5 text-[16px]">
          {COUNTRY_CODES.map((c) => (
            <span key={c} className={strong.some((m) => m.opp.country === c) ? "" : "opacity-20 grayscale"}>
              {COUNTRIES[c].flag}
            </span>
          ))}
        </div>
      </article>
    </section>
  );
}

// ── Match grid ───────────────────────────────────────────────
const TYPES: (OppType | "all")[] = ["all", "grant", "investor", "accelerator", "partner", "programme", "talent"];

function MatchGrid({
  matches,
  track,
  onTrack,
  onDraft,
  onImport,
}: {
  matches: Match[];
  track: Record<string, TrackStage>;
  onTrack: (id: string) => void;
  onDraft: (o: Opportunity) => void;
  onImport: () => void;
}) {
  const [verdict, setVerdict] = useState<"all" | Match["verdict"]>("all");
  const [type, setType] = useState<OppType | "all">("all");
  const count = (v: Match["verdict"]) => matches.filter((m) => m.verdict === v).length;
  const shown = matches.filter((m) => (verdict === "all" || m.verdict === verdict) && (type === "all" || m.opp.type === type));

  return (
    <section className="box p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="micro text-ink-3">Step 2 of 3</p>
          <h2 className="mt-1 text-[22px] font-semibold tracking-tight">Your opportunities</h2>
        </div>
        <button onClick={onImport} className="btn btn-line min-h-9 text-[13px]">
          <Icon name="image" size={15} /> Add from poster
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-line bg-paper-2 p-1">
          {(
            [
              ["all", "All", matches.length, ""],
              ["strong", "Strong", count("strong"), "bg-teal"],
              ["partial", "Partial", count("partial"), "bg-gold"],
              ["no", "Not yet", count("no"), "bg-red"],
            ] as const
          ).map(([k, label, n, dot]) => (
            <button
              key={k}
              onClick={() => setVerdict(k)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${
                verdict === k ? "bg-white text-ink shadow-[0_2px_8px_-4px_rgb(0_0_0/0.3)]" : "text-ink-2 hover:text-ink"
              }`}
            >
              {dot && <span className={`size-2 rounded-full ${dot}`} />}
              {label}
              <span className="font-mono text-[11.5px] text-ink-3">{n}</span>
            </button>
          ))}
        </div>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as OppType | "all")}
          className="h-[42px] rounded-xl border border-line bg-white px-3 text-[13px] font-semibold text-ink outline-none focus:border-blue"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t === "all" ? "All types" : TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {shown.map((m, i) => (
          <MatchCard key={m.opp.id} m={m} i={i} tracked={track[m.opp.id]} onTrack={onTrack} onDraft={onDraft} />
        ))}
        {!shown.length && <p className="col-span-full py-10 text-center text-[14px] text-ink-3">Nothing here. Try another filter.</p>}
      </div>
      <p className="mt-6 text-center text-[11px] text-ink-3">Demo data: real organisations, illustrative amounts and dates.</p>
    </section>
  );
}

function MatchCard({
  m,
  i,
  tracked,
  onTrack,
  onDraft,
}: {
  m: Match;
  i: number;
  tracked?: TrackStage;
  onTrack: (id: string) => void;
  onDraft: (o: Opportunity) => void;
}) {
  const o = m.opp;
  const d = deadline(m);
  const reasons = (m.verdict === "no" ? m.reasons.filter((r) => r.tone === "bad") : m.reasons.filter((r) => r.tone !== "bad")).slice(0, 2);
  return (
    <article
      className={`box box-lift rise flex flex-col p-5 ${m.verdict === "no" ? "bg-paper-2/60" : ""}`}
      style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="micro flex items-center gap-1.5 text-ink-3">
            <span className="text-[14px]">{COUNTRIES[o.country].flag}</span> {COUNTRIES[o.country].name} · {TYPE_LABEL[o.type]}
          </p>
          <h3 className="mt-2 text-[16.5px] font-semibold leading-snug" title={o.summary}>
            {o.name}
          </h3>
          <p className="mt-0.5 text-[12.5px] text-ink-3">
            {o.org}
            {o.imported && <span className="ml-1.5 rounded bg-gold-soft px-1.5 py-0.5 text-[10.5px] font-semibold text-gold-deep">poster</span>}
          </p>
        </div>
        <ScoreRing score={m.score} verdict={m.verdict} />
      </div>

      <ul className="mt-4 flex-1 space-y-1.5">
        {reasons.map((r) => (
          <li key={r.text} className="flex items-start gap-2 text-[13px] leading-snug text-ink-2">
            <span
              className={`mt-px grid size-4 shrink-0 place-items-center rounded-full ${
                r.tone === "good" ? "bg-teal-soft text-teal" : r.tone === "warn" ? "bg-gold-soft text-gold-deep" : "bg-red-soft text-red"
              }`}
            >
              <Icon name={r.tone === "good" ? "check" : r.tone === "warn" ? "alert" : "x"} size={10} stroke={3} />
            </span>
            {r.text}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center gap-2 border-t border-line pt-3.5">
        <span className="font-mono text-[12.5px] font-semibold">{o.amount}</span>
        <span className={`ml-auto rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold ${d.tone}`}>{d.text}</span>
      </div>

      {m.verdict !== "no" && (
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => onTrack(o.id)}
            disabled={!!tracked}
            className={`btn min-h-9 flex-1 px-3 text-[13px] ${tracked ? "bg-teal-soft text-teal-deep disabled:opacity-100" : "btn-blue"}`}
          >
            <Icon name={tracked ? "check" : "bookmark"} size={15} /> {tracked ? TRACK_STAGES.find((s) => s.id === tracked)?.label : "Save"}
          </button>
          <button onClick={() => onDraft(o)} className="btn btn-line min-h-9 px-3 text-[13px]" title="Draft an intro email">
            <Icon name="mail" size={15} /> Intro
          </button>
          {o.url !== "#" && (
            <a href={o.url} target="_blank" rel="noreferrer" className="btn min-h-9 border border-line px-2.5 text-ink-2 hover:border-ink hover:text-ink" title="Open source">
              <Icon name="external" size={15} />
            </a>
          )}
        </div>
      )}
    </article>
  );
}

// ── Side: Ask + chart ────────────────────────────────────────
const SUGGESTIONS = ["Which should I apply to first?", "Apa syarat program Malaysia?", "Tôi nên bắt đầu từ đâu?"];

function AskNexa({ profile, matches }: { profile: Profile; matches: Match[] }) {
  const [q, setQ] = useState("");
  const [log, setLog] = useState<{ q: string; a?: string; err?: boolean }[]>([]);
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (log.length) end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [log]);

  const ask = async (question: string) => {
    if (!question.trim() || busy) return;
    setQ("");
    setBusy(true);
    setLog((l) => [...l, { q: question }]);
    try {
      const r = await post<{ answer: string }>("/api/ask", { question, profile, matches });
      setLog((l) => l.map((x, i) => (i === l.length - 1 ? { ...x, a: r.answer } : x)));
    } catch (e) {
      setLog((l) => l.map((x, i) => (i === l.length - 1 ? { ...x, a: (e as Error).message, err: true } : x)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="box overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line bg-blue px-5 py-4 text-white">
        <span className="grid size-9 place-items-center rounded-lg bg-white/15">
          <Icon name="chat" size={18} />
        </span>
        <div>
          <p className="text-[15px] font-semibold">Ask Nexa</p>
          <p className="text-[11.5px] text-white/75">EN · BM · ID · ไทย · VI</p>
        </div>
      </div>
      <div className="max-h-[340px] space-y-3 overflow-y-auto p-4">
        {!log.length &&
          SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => ask(s)} className="flex w-full items-center justify-between gap-2 rounded-xl border border-line px-3.5 py-2.5 text-left text-[13px] font-medium text-ink-2 transition hover:border-blue hover:text-blue">
              {s} <Icon name="arrow" size={14} />
            </button>
          ))}
        {log.map((m, i) => (
          <div key={i} className="space-y-2">
            <p className="ml-8 rounded-2xl rounded-br-md bg-blue px-3.5 py-2.5 text-[13px] text-white">{m.q}</p>
            {m.a ? (
              <p className={`mr-4 whitespace-pre-wrap rounded-2xl rounded-bl-md border border-line bg-paper-2 px-3.5 py-3 text-[13px] leading-relaxed ${m.err ? "text-red" : "text-ink"}`}>
                {m.a}
              </p>
            ) : (
              <div className="mr-4 flex w-16 gap-1.5 rounded-2xl border border-line bg-paper-2 px-3.5 py-3.5">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="dot size-1.5 rounded-full bg-blue" style={{ animationDelay: `${d * 0.15}s` }} />
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={end} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
        className="flex gap-2 border-t border-line p-3"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask in any language…"
          className="min-w-0 flex-1 rounded-lg bg-paper-2 px-3 text-[13px] outline-none focus:ring-2 focus:ring-blue-soft"
        />
        <button disabled={busy || !q.trim()} className="btn btn-blue min-h-9 px-3" aria-label="Send">
          <Icon name="send" size={15} />
        </button>
      </form>
    </section>
  );
}

/** Upcoming events open to startups that cover this startup's sector. */
function EventsForYou({ profile }: { profile: Profile }) {
  const [events, setEvents] = useState<EventSummary[] | null>(null);
  useEffect(() => {
    // With a Nexa profile, the server ranks events by who's in the room; otherwise filter by sector here.
    if (personHeaders()["x-person-key"]) {
      getJson<{ recommended: EventRec[] }>("/api/me")
        .then((r) => setEvents(r.recommended.map((x) => x.event)))
        .catch(() => setEvents([]));
      return;
    }
    getJson<{ events: EventSummary[] }>("/api/events")
      .then((j) => setEvents(j.events))
      .catch(() => setEvents([]));
  }, []);
  const now = Date.now();
  const fit = (events ?? [])
    .filter((e) => new Date(e.end).getTime() > now && e.audience.includes("startup") && (e.sectors === "any" || e.sectors.includes(profile.sector)))
    .slice(0, 3);

  return (
    <section className="box p-5">
      <div className="flex items-center justify-between">
        <p className="micro text-ink-3">Events for you</p>
        <Link href="/events" className="micro text-blue hover:underline">All</Link>
      </div>
      <div className="mt-3 space-y-2">
        {fit.map((e) => (
          <Link key={e.id} href={`/events/${e.id}`} className="block rounded-xl border border-line p-3 transition hover:border-blue">
            <p className="font-mono text-[11px] text-ink-3">
              {new Date(e.start).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {e.format === "online" ? "Online" : `${COUNTRIES[e.country].flag} ${e.city}`}
            </p>
            <p className="mt-0.5 text-[13.5px] font-semibold leading-snug">{e.title}</p>
            <p className="mt-1 text-[12px] text-ink-3">{e.counts.vc} investors registered</p>
          </Link>
        ))}
        {events && !fit.length && <p className="text-[13px] text-ink-3">No upcoming events for {sectorLabel(profile.sector)} yet.</p>}
        {!events && <div className="h-16 animate-pulse rounded-xl bg-stone" />}
      </div>
    </section>
  );
}

function CountryChart({ matches }: { matches: Match[] }) {
  const rows = COUNTRY_CODES.map((c) => ({
    c,
    strong: matches.filter((m) => m.opp.country === c && m.verdict === "strong").length,
    partial: matches.filter((m) => m.opp.country === c && m.verdict === "partial").length,
  }))
    .filter((r) => r.strong + r.partial > 0)
    .sort((a, b) => b.strong - a.strong || b.partial - a.partial);
  const max = Math.max(1, ...rows.map((r) => r.strong + r.partial));

  return (
    <section className="box p-5">
      <p className="micro text-ink-3">Where your doors are</p>
      <div className="mt-4 space-y-2.5">
        {rows.map((r) => (
          <div key={r.c} className="flex items-center gap-2.5">
            <span className="w-24 truncate text-[12.5px] text-ink-2">
              {COUNTRIES[r.c].flag} {COUNTRIES[r.c].name}
            </span>
            <span className="flex h-3 flex-1 overflow-hidden rounded-full bg-stone">
              <span className="bg-teal transition-[width] duration-700" style={{ width: `${(r.strong / max) * 100}%` }} />
              <span className="bg-gold transition-[width] duration-700" style={{ width: `${(r.partial / max) * 100}%` }} />
            </span>
            <span className="w-5 text-right font-mono text-[12px]">{r.strong + r.partial}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-4 text-[11.5px] text-ink-2">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-teal" /> strong</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-gold" /> partial</span>
      </div>
    </section>
  );
}

// ── Tracker ──────────────────────────────────────────────────
const STAGE_COLOR: Record<TrackStage, string> = { saved: "#9fc3e6", applied: "#2f5bd3", meeting: "#e9a41c", deal: "#0e9f9a" };

function Tracker({ matches, track, onChange }: { matches: Match[]; track: Record<string, TrackStage>; onChange: (t: Record<string, TrackStage>) => void }) {
  const byId = new Map(matches.map((m) => [m.opp.id, m]));
  const order = TRACK_STAGES.map((s) => s.id);
  const move = (id: string, dir: 1 | -1) => {
    const next = order[order.indexOf(track[id]) + dir];
    if (next) onChange({ ...track, [id]: next });
  };
  const remove = (id: string) => {
    const t = { ...track };
    delete t[id];
    onChange(t);
  };
  const reached = (s: TrackStage) => Object.values(track).filter((x) => order.indexOf(x) >= order.indexOf(s)).length;
  const total = Object.keys(track).length;

  return (
    <>
      <section className="box p-5 sm:p-6">
        <p className="micro text-ink-3">Step 3 of 3 · Outcomes</p>
        <h2 className="mt-1 text-[22px] font-semibold tracking-tight">From match to deal</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {TRACK_STAGES.map((s, i) => {
            const n = reached(s.id);
            return (
              <div key={s.id} className="relative rounded-xl border border-line p-4">
                <p className="micro flex items-center gap-1.5 text-ink-3">
                  <span className="size-2 rounded-full" style={{ background: STAGE_COLOR[s.id] }} /> {s.label}
                </p>
                <p className="mt-2 font-mono text-[32px] font-semibold leading-none">{n}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone">
                  <span className="block h-full rounded-full transition-[width] duration-700" style={{ width: `${total ? (n / total) * 100 : 0}%`, background: STAGE_COLOR[s.id] }} />
                </div>
                {i > 0 && (
                  <p className="mt-2 font-mono text-[11px] text-ink-3">{reached(order[i - 1]) ? Math.round((n / reached(order[i - 1])) * 100) : 0}% converted</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {total === 0 ? (
        <section className="box grid place-items-center px-6 py-16 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-blue-soft text-blue">
            <Icon name="bookmark" size={22} />
          </span>
          <p className="mt-4 text-[16px] font-semibold">Nothing tracked yet</p>
          <p className="mt-1 text-[13px] text-ink-3">Press Save on any match.</p>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-4">
          {TRACK_STAGES.map((s) => (
            <div key={s.id} className="box p-3">
              <p className="micro flex items-center gap-2 px-2 py-1.5 text-ink-2">
                <span className="size-2.5 rounded-full" style={{ background: STAGE_COLOR[s.id] }} /> {s.label}
              </p>
              <div className="mt-2 min-h-24 space-y-2">
                {Object.entries(track)
                  .filter(([, st]) => st === s.id)
                  .map(([id]) => {
                    const m = byId.get(id);
                    if (!m) return null;
                    return (
                      <div key={id} className="rise rounded-xl border border-line bg-white p-3" style={{ borderLeft: `3px solid ${STAGE_COLOR[s.id]}` }}>
                        <p className="micro text-ink-3">
                          {COUNTRIES[m.opp.country].flag} {TYPE_LABEL[m.opp.type]}
                        </p>
                        <p className="mt-1 text-[13.5px] font-semibold leading-snug">{m.opp.name}</p>
                        <div className="mt-2.5 flex items-center gap-1">
                          <button onClick={() => move(id, -1)} disabled={s.id === "saved"} className="grid size-7 place-items-center rounded-lg border border-line disabled:opacity-30" aria-label="Back">
                            <Icon name="back" size={14} />
                          </button>
                          <button onClick={() => move(id, 1)} disabled={s.id === "deal"} className="grid size-7 place-items-center rounded-lg bg-blue text-white disabled:opacity-30" aria-label="Forward">
                            <Icon name="arrow" size={14} />
                          </button>
                          <button onClick={() => remove(id)} className="ml-auto grid size-7 place-items-center rounded-lg text-ink-3 hover:text-red" aria-label="Remove">
                            <Icon name="trash" size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </section>
      )}
    </>
  );
}

// ── Modals ───────────────────────────────────────────────────
function Modal({ title, kicker, onClose, children }: { title: string; kicker: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="box rise max-h-[90vh] w-full max-w-lg overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="micro text-ink-3">{kicker}</p>
            <h2 className="mt-1 text-[20px] font-semibold tracking-tight">{title}</h2>
          </div>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-lg border border-line text-ink-2 hover:text-ink" aria-label="Close">
            <Icon name="x" size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EditModal({ profile: p, onChange, onClose }: { profile: Profile; onChange: (p: Profile) => void; onClose: () => void }) {
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => onChange({ ...p, [k]: v });
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const select = "mt-1.5 h-10 w-full rounded-lg border border-line bg-white px-3 text-[14px] font-semibold text-ink outline-none focus:border-blue";
  return (
    <Modal title="Fix anything Gemma got wrong" kicker="Your profile" onClose={onClose}>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <label className="micro text-ink-3">
          Based in
          <select className={select} value={p.country} onChange={(e) => set("country", e.target.value as Country)}>
            {COUNTRY_CODES.map((c) => (
              <option key={c} value={c}>{COUNTRIES[c].flag} {COUNTRIES[c].name}</option>
            ))}
          </select>
        </label>
        <label className="micro text-ink-3">
          Stage
          <select className={select} value={p.stage} onChange={(e) => set("stage", e.target.value as Profile["stage"])}>
            {STAGES.map((s) => (
              <option key={s} value={s}>{STAGE_LABEL[s]}</option>
            ))}
          </select>
        </label>
        <label className="micro col-span-2 text-ink-3">
          Sector
          <select className={select} value={p.sector} onChange={(e) => set("sector", e.target.value as Profile["sector"])}>
            {SECTORS.map((s) => (
              <option key={s} value={s}>{sectorLabel(s)}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="micro mt-5 text-ink-3">Needs</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {NEEDS.map((n) => (
          <button
            key={n}
            onClick={() => set("needs", toggle(p.needs, n))}
            className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition ${p.needs.includes(n) ? "border-red bg-red text-white" : "border-line text-ink-2 hover:border-red"}`}
          >
            {NEED_LABEL[n]}
          </button>
        ))}
      </div>
      <p className="micro mt-5 text-ink-3">Expanding to</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {COUNTRY_CODES.filter((c) => c !== p.country).map((c) => (
          <button
            key={c}
            onClick={() => set("targetMarkets", toggle(p.targetMarkets, c))}
            className={`rounded-full border px-2.5 py-1.5 text-[12.5px] font-semibold transition ${p.targetMarkets.includes(c) ? "border-blue bg-blue text-white" : "border-line text-ink-2 hover:border-blue"}`}
          >
            {COUNTRIES[c].flag} {COUNTRIES[c].name}
          </button>
        ))}
      </div>
      <button onClick={onClose} className="btn btn-blue mt-6 w-full">
        <Icon name="check" size={16} /> Done · matches updated
      </button>
    </Modal>
  );
}

function DraftModal({ profile, opp, onClose }: { profile: Profile; opp: Opportunity; onClose: () => void }) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    post<{ draft: string }>("/api/draft", { profile, opp })
      .then((r) => setDraft(r.draft))
      .catch((e) => setError(e.message));
  }, [profile, opp]);

  return (
    <Modal title={opp.name} kicker={`Intro email · ${opp.org}`} onClose={onClose}>
      {error ? (
        <p className="mt-4 rounded-lg bg-red-soft px-4 py-3 text-[13px] font-semibold text-red">{error}</p>
      ) : !draft ? (
        <div className="mt-6 space-y-2.5">
          {[60, 100, 92, 100, 70, 40].map((w, i) => (
            <div key={i} className="h-3 animate-pulse rounded-full bg-stone" style={{ width: `${w}%` }} />
          ))}
        </div>
      ) : (
        <>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={13}
            className="mt-5 w-full rounded-xl border border-line bg-paper-2 p-4 text-[13.5px] leading-relaxed outline-none focus:border-blue"
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(draft);
              setCopied(true);
            }}
            className="btn btn-blue mt-3"
          >
            <Icon name={copied ? "check" : "copy"} size={15} /> {copied ? "Copied" : "Copy email"}
          </button>
        </>
      )}
    </Modal>
  );
}

function PosterModal({ onClose, onAdd }: { onClose: () => void; onAdd: (o: Opportunity) => void }) {
  const [files, setFiles] = useState<FilePart[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Opportunity | null>(null);

  const read = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await post<{ opp: Opportunity }>("/api/poster", { text, files });
      setPreview(r.opp);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Poster → opportunity" kicker="Grow the gateway" onClose={onClose}>
      {!preview ? (
        <>
          <label className="mt-5 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-line-strong bg-paper-2 px-4 py-9 text-center transition hover:border-blue">
            <span className="grid size-12 place-items-center rounded-xl bg-white text-blue shadow-[0_8px_20px_-10px_rgb(0_51_160/0.5)]">
              <Icon name="image" size={22} />
            </span>
            <span className="mt-3 text-[14px] font-semibold">{files.length ? files.map((f) => f.name).join(", ") : "Poster, screenshot or PDF"}</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              hidden
              onChange={async (e) => e.target.files && setFiles(await Promise.all([...e.target.files].slice(0, 3).map(readFile)))}
            />
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="…or paste the post text"
            className="mt-3 w-full rounded-xl border border-line px-4 py-3 text-[13.5px] outline-none focus:border-blue"
          />
          {error && <p className="mt-3 rounded-lg bg-red-soft px-4 py-3 text-[13px] font-semibold text-red">{error}</p>}
          <button onClick={read} disabled={busy || (!files.length && !text.trim())} className="btn btn-blue mt-4 w-full">
            {busy ? (
              <>
                <span className="dot size-1.5 rounded-full bg-white" /> Gemma 4 is reading
              </>
            ) : (
              <>
                <Icon name="spark" size={15} /> Read with Gemma 4
              </>
            )}
          </button>
        </>
      ) : (
        <div className="mt-5">
          <div className="box p-5">
            <p className="micro text-ink-3">
              {COUNTRIES[preview.country].flag} {COUNTRIES[preview.country].name} · {TYPE_LABEL[preview.type]}
            </p>
            <h3 className="mt-2 text-[17px] font-semibold">{preview.name}</h3>
            <p className="text-[12.5px] text-ink-3">{preview.org}</p>
            <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line">
              {[
                ["Amount", preview.amount],
                ["Deadline", preview.deadline],
                ["Stages", preview.stages.map((s) => STAGE_LABEL[s]).join(", ")],
                ["Offers", preview.offers.map((n) => NEED_LABEL[n]).join(", ")],
              ].map(([k, v]) => (
                <div key={k} className="bg-white p-3">
                  <p className="micro text-ink-3">{k}</p>
                  <p className="mt-0.5 text-[13px] font-semibold">{v}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={() => onAdd(preview)} className="btn btn-blue">
              <Icon name="check" size={15} /> Add to gateway
            </button>
            <button onClick={() => setPreview(null)} className="btn btn-line">
              Try another
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
