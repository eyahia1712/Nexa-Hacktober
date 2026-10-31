"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AppHeader } from "@/components/AppHeader";
import { CompanyCard } from "@/components/CompanyCard";
import { Icon } from "@/components/Icon";
import { BTN_GHOST, BTN_INK, BTN_SAFFRON, Flag, INPUT, Loading, Micro, Modal, ScoreRing, VERDICT_COLOR } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { matchAll } from "@/lib/match";
import { OPPORTUNITIES } from "@/lib/opportunities";
import { getSession, loadProfile, loadRequest, loadTracker, saveRequest, saveTracker, type Session } from "@/lib/store";
import {
  COUNTRIES,
  COUNTRY_CODES,
  NEEDS,
  NEED_LABEL,
  OPP_TYPES,
  TRACK_STAGES,
  TYPE_LABEL,
  type Match,
  type OppType,
  type Pathway,
  type Profile,
  type Request,
  type TrackStage,
} from "@/lib/types";
import { cn, fileToBase64 } from "@/lib/utils";

const TABS = [
  { id: "overview", key: "tab.overview" },
  { id: "opps", key: "tab.opps" },
  { id: "pathway", key: "tab.pathway" },
  { id: "tracker", key: "tab.tracker" },
  { id: "ask", key: "tab.ask" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default function Dashboard() {
  const { t } = useI18n();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [request, setRequest] = useState<Request | null>(null);
  const [editingNeed, setEditingNeed] = useState(false);
  const [tracker, setTracker] = useState<Record<string, TrackStage>>({});
  const [tab, setTab] = useState<Tab>("overview");
  const [chosen, setChosen] = useState<string | null>(null);

  useEffect(() => {
    const s = getSession();
    if (!s) return router.replace("/login");
    const p = loadProfile(s.email);
    if (!p) return router.replace("/start");
    setSession(s);
    setProfile(p);
    setRequest(loadRequest(s.email));
    setTracker(loadTracker(s.email));
  }, [router]);

  const matches = useMemo(() => (profile && request ? matchAll(profile, request, OPPORTUNITIES) : []), [profile, request]);

  const go = (next: Tab) => {
    setTab(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openPath = (id: string) => {
    setChosen(id);
    go("pathway");
  };
  const track = useCallback(
    (id: string, stage: TrackStage | null) => {
      if (!session) return;
      setTracker((cur) => {
        const next = { ...cur };
        if (stage) next[id] = stage;
        else delete next[id];
        saveTracker(session.email, next);
        return next;
      });
    },
    [session],
  );

  if (!session || !profile) return <div className="min-h-dvh bg-paper" />;

  const showComposer = !request || editingNeed;

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <AppHeader />

      {profile.source === "sample" ? (
        <div className="border-b border-line bg-saffron-soft">
          <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center gap-3 px-5 py-2 text-[13px] md:px-8">
            <span>{t("dash.sampleBanner", { name: profile.name })}</span>
            <Link href="/login" className="underline underline-offset-4">
              {t("dash.own")}
            </Link>
          </div>
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-[1240px] px-5 pt-7 pb-20 md:px-8">
        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,330px)_minmax(0,1fr)] lg:gap-10">
          <aside className="lg:sticky lg:top-20">
            <CompanyCard profile={profile} request={request} onEdit={() => router.push("/start?edit=1")} />
          </aside>

          <section className="min-w-0">
            <nav className="-mx-1 flex gap-1 overflow-x-auto pb-1" aria-label="Dashboard">
              {TABS.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  disabled={!request && item.id !== "overview"}
                  aria-current={tab === item.id ? "page" : undefined}
                  className={cn(
                    "nx-focus inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-[14px] transition-colors disabled:opacity-40",
                    tab === item.id ? "border-saffron bg-saffron-soft text-ink shadow-[inset_0_-2px_0_var(--saffron)]" : "border-line bg-card text-ink-2 hover:border-line-strong hover:text-ink",
                  )}
                >
                  <span className={cn("font-mono text-[11px]", tab === item.id ? "text-saffron-deep" : "text-ink-3")}>0{i + 1}</span>
                  {t(item.key)}
                  {item.id === "tracker" && Object.keys(tracker).length ? (
                    <span className="grid size-5 place-items-center rounded-full bg-asean font-mono text-[10px] text-white">{Object.keys(tracker).length}</span>
                  ) : null}
                </button>
              ))}
            </nav>

            <div className="mt-6" key={tab}>
              {tab === "overview" ? (
                showComposer ? (
                  <NeedComposer
                    profile={profile}
                    initial={request}
                    onCancel={request ? () => setEditingNeed(false) : undefined}
                    onDone={(r) => {
                      saveRequest(session.email, r);
                      setRequest(r);
                      setEditingNeed(false);
                    }}
                  />
                ) : (
                  <Overview profile={profile} request={request!} matches={matches} tracker={tracker} onEditNeed={() => setEditingNeed(true)} onPath={openPath} onTrack={track} onAll={() => go("opps")} />
                )
              ) : null}
              {tab === "opps" ? <Opportunities matches={matches} tracker={tracker} onPath={openPath} onTrack={track} /> : null}
              {tab === "pathway" && request ? (
                <PathwayView profile={profile} request={request} matches={matches} chosen={chosen} onChoose={setChosen} tracker={tracker} onTrack={track} onBrowse={() => go("opps")} />
              ) : null}
              {tab === "tracker" ? <Tracker matches={matches} tracker={tracker} onTrack={track} onPath={openPath} /> : null}
              {tab === "ask" && request ? <Ask profile={profile} request={request} matches={matches} /> : null}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

/* ── Step 3: what are you looking for? ─────────────────────── */

function NeedComposer({ profile, initial, onDone, onCancel }: { profile: Profile; initial: Request | null; onDone: (r: Request) => void; onCancel?: () => void }) {
  const { t } = useI18n();
  const file = useRef<HTMLInputElement>(null);
  const [r, setR] = useState<Request>(initial ?? { needs: [], targetMarkets: [] });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const read = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/need", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile: { ...profile, logo: undefined, banner: undefined }, text: r.notes ?? "", uploads: [{ name: f.name, mime: f.type || "application/octet-stream", data: await fileToBase64(f) }] }),
      });
      const json = await res.json();
      if (!res.ok || !json.request) throw new Error();
      setR(json.request);
      setNote(t("need.read", { file: f.name }));
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <div className="nx-rise">
      <Micro>{t("need.eyebrow")}</Micro>
      <h2 className="mt-2 text-[clamp(1.6rem,3vw,2.3rem)] leading-tight font-medium tracking-[-0.02em]">{t("need.title", { name: profile.name })}</h2>
      <p className="mt-2 max-w-2xl text-[15px] text-ink-2">{t("need.sub")}</p>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_300px]">
        <div className="nx-card p-6">
          <Micro>{t("need.what")}</Micro>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {NEEDS.map((n, i) => {
              const on = r.needs.includes(n);
              return (
                <button
                  key={n}
                  onClick={() => setR({ ...r, needs: toggle(r.needs, n) })}
                  aria-pressed={on}
                  className={cn(
                    "nx-focus flex items-center gap-2.5 rounded-xl border px-3 py-3 text-left text-[14px] transition-all",
                    on ? "border-ink bg-ink text-paper" : "border-line bg-card hover:border-line-strong",
                  )}
                >
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: ["#0033a0", "#ffc300", "#d0103a", "#0e7a4b", "#7c3aed", "#0891b2"][i] }} />
                  {NEED_LABEL[n]}
                </button>
              );
            })}
          </div>

          <Micro className="mt-6">{t("need.where")}</Micro>
          <div className="mt-3 flex flex-wrap gap-2">
            {COUNTRY_CODES.filter((c) => c !== profile.country).map((c) => {
              const on = r.targetMarkets.includes(c);
              return (
                <button
                  key={c}
                  onClick={() => setR({ ...r, targetMarkets: toggle(r.targetMarkets, c) })}
                  aria-pressed={on}
                  className={cn(
                    "nx-focus inline-flex h-9 items-center gap-2 rounded-full border px-3 text-[13px] transition-colors",
                    on ? "border-asean bg-asean-soft text-asean" : "border-line bg-card text-ink-2 hover:border-line-strong",
                  )}
                >
                  <span className="text-[15px]">{COUNTRIES[c].flag}</span>
                  {COUNTRIES[c].name}
                </button>
              );
            })}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <Micro>{t("need.ask")}</Micro>
              <input className={INPUT} value={r.ask ?? ""} onChange={(e) => setR({ ...r, ask: e.target.value || undefined })} placeholder={t("need.askPh")} />
            </label>
            <label className="block">
              <Micro>{t("need.notes")}</Micro>
              <input className={INPUT} value={r.notes ?? ""} onChange={(e) => setR({ ...r, notes: e.target.value || undefined })} />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button className={cn(BTN_SAFFRON, "min-h-11 px-5")} disabled={!r.needs.length || busy} onClick={() => onDone(r)}>
              {t("need.find")}
              <Icon name="arrow" size={15} />
            </button>
            {onCancel ? (
              <button className={BTN_GHOST} onClick={onCancel}>
                {t("f.back")}
              </button>
            ) : null}
            {!r.needs.length ? <p className="text-[13px] text-ink-3">{t("need.pick")}</p> : null}
          </div>
        </div>

        <div className="nx-card nx-dotgrid flex flex-col items-center justify-center p-6 text-center">
          <div className="grid size-12 place-items-center rounded-xl bg-asean text-white">
            <Icon name="doc" size={22} />
          </div>
          <p className="mt-4 text-[16px] font-medium">{t("need.upload")}</p>
          <p className="mt-1 text-[12.5px] text-ink-3">PDF · PPTX · DOCX · Gemma 4</p>
          {busy ? (
            <div className="mt-4">
              <Loading label={t("need.reading")} />
            </div>
          ) : (
            <button className={cn(BTN_INK, "mt-4")} onClick={() => file.current?.click()}>
              <Icon name="upload" size={15} />
              {t("start.choose")}
            </button>
          )}
          <input
            ref={file}
            type="file"
            accept=".pdf,.pptx,.docx,.txt,image/*"
            className="hidden"
            onChange={(e) => {
              void read(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {note ? <p className="mt-4 text-[12.5px] text-good">{note}</p> : null}
          {error ? <p className="mt-4 text-[12.5px] text-bad">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}

/* ── Overview ──────────────────────────────────────────────── */

function Overview({
  profile,
  request,
  matches,
  tracker,
  onEditNeed,
  onPath,
  onTrack,
  onAll,
}: {
  profile: Profile;
  request: Request;
  matches: Match[];
  tracker: Record<string, TrackStage>;
  onEditNeed: () => void;
  onPath: (id: string) => void;
  onTrack: (id: string, s: TrackStage | null) => void;
  onAll: () => void;
}) {
  const { t } = useI18n();
  const strong = matches.filter((m) => m.verdict === "strong");
  const eligible = matches.filter((m) => m.verdict !== "no");
  const closing = eligible.filter((m) => m.daysLeft !== null && m.daysLeft <= 30);
  const countries = new Set(eligible.map((m) => m.opp.country));
  const best = matches[0];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Micro>01 · {t("tab.overview")}</Micro>
          <h2 className="mt-2 text-[clamp(1.6rem,3vw,2.3rem)] leading-tight font-medium tracking-[-0.02em]">{t("opp.title", { n: matches.length })}</h2>
        </div>
        <button className={BTN_GHOST} onClick={onEditNeed}>
          <Icon name="edit" size={14} />
          {t("need.edit")}
        </button>
      </div>

      {/* What you asked for, in one row (like Nexa's Today → Next role → Pathway strip). */}
      <div className="nx-card mt-5 grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[
          { n: 1, color: "#0033a0", label: t("need.what"), value: request.needs.map((x) => NEED_LABEL[x]).join(", ") },
          { n: 2, color: "#d0103a", label: t("need.where"), value: request.targetMarkets.length ? request.targetMarkets.map((c) => COUNTRIES[c].flag).join(" ") : `${COUNTRIES[profile.country].flag} ${COUNTRIES[profile.country].name}` },
          { n: 3, color: "#0e7a4b", label: t("ov.top"), value: best ? best.opp.name : "—" },
        ].map((s) => (
          <div key={s.n} className="flex items-center gap-3 p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-full font-mono text-[14px] text-white" style={{ background: s.color }}>
              {s.n}
            </span>
            <div className="min-w-0">
              <p className="nx-micro text-ink-3">{s.label}</p>
              <p className="mt-0.5 line-clamp-2 text-[15px] leading-snug font-medium">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi value={String(strong.length)} label={t("kpi.strong")} color="var(--good)">
          <div className="flex flex-wrap gap-1">
            {matches.map((m) => (
              <span key={m.opp.id} className="size-2.5 rounded-full" style={{ background: VERDICT_COLOR[m.verdict], opacity: m.verdict === "no" ? 0.35 : 1 }} title={m.opp.name} />
            ))}
          </div>
        </Kpi>
        <Kpi value={best ? String(best.score) : "—"} label={t("kpi.best")} color="var(--asean)">
          <div className="h-3 overflow-hidden rounded-full bg-stone">
            <span className="nx-grow block h-full rounded-full" style={{ width: `${best?.score ?? 0}%`, background: "linear-gradient(90deg,#5b86e5,#0033a0)" }} />
          </div>
        </Kpi>
        <Kpi value={String(closing.length)} label={t("kpi.closing")} color="var(--asean-red)">
          <div className="h-3 overflow-hidden rounded-full bg-stone">
            <span className="nx-grow block h-full rounded-full" style={{ width: `${eligible.length ? (closing.length / eligible.length) * 100 : 0}%`, background: "linear-gradient(90deg,#ffc300,#d0103a)" }} />
          </div>
        </Kpi>
        <Kpi value={String(countries.size)} suffix={t("kpi.of11")} label={t("kpi.countries")} color="var(--ink)">
          <div className="flex flex-wrap gap-0.5 text-[15px] leading-none">
            {COUNTRY_CODES.map((c) => (
              <span key={c} className={countries.has(c) ? "" : "opacity-20 grayscale"} title={COUNTRIES[c].name}>
                {COUNTRIES[c].flag}
              </span>
            ))}
          </div>
        </Kpi>
      </div>

      <div className="mt-8 flex items-end justify-between gap-3">
        <p className="text-[19px] font-medium">{t("ov.top")}</p>
        <button onClick={onAll} className="nx-micro nx-focus text-ink-2 underline-offset-4 hover:text-ink hover:underline">
          {t("ov.all", { n: matches.length })} →
        </button>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {matches.slice(0, 4).map((m, i) => (
          <OppCard key={m.opp.id} m={m} index={i} saved={!!tracker[m.opp.id]} onPath={onPath} onTrack={onTrack} />
        ))}
      </div>

      <CountryBars matches={matches} />
    </div>
  );
}

function Kpi({ value, suffix, label, color, children }: { value: string; suffix?: string; label: string; color: string; children: React.ReactNode }) {
  return (
    <div className="nx-card nx-lift flex flex-col p-5">
      <p className="font-mono text-[36px] leading-none font-semibold" style={{ color }}>
        {value}
        {suffix ? <span className="text-[18px] text-ink-3">{suffix}</span> : null}
      </p>
      <p className="mt-2 flex-1 text-[13.5px] text-ink-2">{label}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function CountryBars({ matches }: { matches: Match[] }) {
  const { t } = useI18n();
  const rows = COUNTRY_CODES.map((c) => {
    const here = matches.filter((m) => m.opp.country === c);
    return { c, strong: here.filter((m) => m.verdict === "strong").length, partial: here.filter((m) => m.verdict === "partial").length, total: here.length };
  });
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <div className="nx-card mt-8 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[17px] font-medium">{t("ov.map")}</p>
        <div className="flex gap-4 text-[12px] text-ink-2">
          {(["strong", "partial", "no"] as const).map((v) => (
            <span key={v} className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: VERDICT_COLOR[v] }} />
              {t(`opp.${v}`)}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-5 space-y-2">
        {rows.map((r) => (
          <div key={r.c} className="grid grid-cols-[120px_1fr_24px] items-center gap-3 text-[13px]">
            <span className="truncate">
              {COUNTRIES[r.c].flag} {COUNTRIES[r.c].name}
            </span>
            <span className="flex h-3 overflow-hidden rounded-full bg-stone">
              <span className="nx-grow h-full bg-good" style={{ width: `${(r.strong / max) * 100}%` }} />
              <span className="nx-grow h-full bg-warn" style={{ width: `${(r.partial / max) * 100}%` }} />
              <span className="nx-grow h-full bg-bad/40" style={{ width: `${((r.total - r.strong - r.partial) / max) * 100}%` }} />
            </span>
            <span className="text-right font-mono text-ink-3">{r.total}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── One opportunity, as a Nexa problem-statement card ─────── */

function Deadline({ m }: { m: Match }) {
  const { t } = useI18n();
  if (m.daysLeft === null) return <span className="rounded-full bg-stone px-2.5 py-1 font-mono text-[11px] text-ink-2">{t("opp.rolling")}</span>;
  if (m.daysLeft < 0) return <span className="rounded-full bg-bad/10 px-2.5 py-1 font-mono text-[11px] text-bad">{t("opp.closed")}</span>;
  const urgent = m.daysLeft <= 21;
  return (
    <span className={cn("rounded-full px-2.5 py-1 font-mono text-[11px]", urgent ? "bg-asean-red/10 text-asean-red" : "bg-asean-soft text-asean")}>{t("opp.daysLeft", { n: m.daysLeft })}</span>
  );
}

function Reasons({ m, max = 2 }: { m: Match; max?: number }) {
  const { t } = useI18n();
  const list = m.verdict === "no" ? m.reasons.filter((r) => r.tone === "bad") : m.reasons.filter((r) => r.tone !== "bad");
  return (
    <ul className="space-y-1.5">
      {list.slice(0, max).map((r) => (
        <li key={r.key} className="flex items-start gap-2 text-[13px] leading-snug text-ink-2">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full" style={{ background: r.tone === "good" ? "var(--good)" : r.tone === "warn" ? "var(--warn)" : "var(--bad)" }} />
          {t(r.key, r.vars)}
        </li>
      ))}
    </ul>
  );
}

function OppCard({ m, index, saved, onPath, onTrack }: { m: Match; index: number; saved: boolean; onPath: (id: string) => void; onTrack: (id: string, s: TrackStage | null) => void }) {
  const { t } = useI18n();
  return (
    <article className={cn("nx-card nx-lift nx-rise flex flex-col p-5", m.verdict === "no" && "opacity-75")} style={{ ["--i" as string]: index }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="nx-micro text-ink-3">
            {TYPE_LABEL[m.opp.type]} · <Flag code={m.opp.country} /> {COUNTRIES[m.opp.country].name}
          </p>
          <p className="mt-2 text-[17px] leading-snug font-medium">{m.opp.name}</p>
          <p className="mt-0.5 text-[13px] text-ink-3">{m.opp.org}</p>
        </div>
        <ScoreRing score={m.score} verdict={m.verdict} />
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone">
        <span className="nx-grow block h-full rounded-full" style={{ width: `${m.verdict === "no" ? 100 : m.score}%`, background: VERDICT_COLOR[m.verdict], opacity: m.verdict === "no" ? 0.25 : 1 }} />
      </div>
      <div className="mt-3 flex-1">
        <Reasons m={m} />
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
        <span className="truncate font-mono text-[12.5px]">{m.opp.amount}</span>
        <Deadline m={m} />
      </div>
      <div className="mt-3 flex items-center gap-2">
        {m.verdict !== "no" ? (
          <button className={cn(BTN_SAFFRON, "min-h-9 flex-1")} onClick={() => onPath(m.opp.id)}>
            {t("opp.path")}
          </button>
        ) : (
          <span className="flex-1 text-[12px] text-bad">{t("opp.no")}</span>
        )}
        <button
          onClick={() => onTrack(m.opp.id, saved ? null : "saved")}
          aria-pressed={saved}
          title={saved ? t("opp.saved") : t("opp.save")}
          className={cn("nx-focus grid size-9 place-items-center rounded-md border transition-colors", saved ? "border-asean bg-asean text-white" : "border-line text-ink-2 hover:border-ink")}
        >
          <Icon name="bookmark" size={15} />
        </button>
        <a href={m.opp.url} target="_blank" rel="noreferrer" title={t("opp.source")} className="nx-focus grid size-9 place-items-center rounded-md border border-line text-ink-2 hover:border-ink">
          <Icon name="external" size={15} />
        </a>
      </div>
    </article>
  );
}

/* ── All opportunities ─────────────────────────────────────── */

function Opportunities({ matches, tracker, onPath, onTrack }: { matches: Match[]; tracker: Record<string, TrackStage>; onPath: (id: string) => void; onTrack: (id: string, s: TrackStage | null) => void }) {
  const { t } = useI18n();
  const [verdict, setVerdict] = useState<"all" | Match["verdict"]>("all");
  const [type, setType] = useState<"all" | OppType>("all");
  const list = matches.filter((m) => (verdict === "all" || m.verdict === verdict) && (type === "all" || m.opp.type === type));
  const count = (v: Match["verdict"]) => matches.filter((m) => m.verdict === v).length;

  return (
    <div>
      <Micro>02 · {t("tab.opps")}</Micro>
      <h2 className="mt-2 text-[clamp(1.6rem,3vw,2.3rem)] leading-tight font-medium tracking-[-0.02em]">{t("opp.title", { n: matches.length })}</h2>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="inline-flex flex-wrap rounded-lg border border-line bg-card p-0.5">
          {(["all", "strong", "partial", "no"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVerdict(v)}
              className={cn(
                "nx-focus inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] transition-colors",
                v === verdict ? "bg-ink text-paper" : "text-ink-2 hover:text-ink",
              )}
            >
              {v !== "all" ? <span className="size-2 rounded-full" style={{ background: VERDICT_COLOR[v] }} /> : null}
              {t(`opp.${v}`)}
              <span className="font-mono text-[11px] opacity-60">{v === "all" ? matches.length : count(v)}</span>
            </button>
          ))}
        </div>
        <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="nx-focus h-10 rounded-lg border border-line bg-card px-3 text-[13.5px]">
          <option value="all">{t("opp.anyType")}</option>
          {OPP_TYPES.map((o) => (
            <option key={o} value={o}>
              {TYPE_LABEL[o]}
            </option>
          ))}
        </select>
      </div>
      {list.length ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {list.map((m, i) => (
            <OppCard key={m.opp.id} m={m} index={i} saved={!!tracker[m.opp.id]} onPath={onPath} onTrack={onTrack} />
          ))}
        </div>
      ) : (
        <p className="mt-10 text-center text-[14px] text-ink-3">{t("opp.empty")}</p>
      )}
    </div>
  );
}

/* ── Pathway ───────────────────────────────────────────────── */

const pathCache = new Map<string, Pathway>();

function PathwayView({
  profile,
  request,
  matches,
  chosen,
  onChoose,
  tracker,
  onTrack,
  onBrowse,
}: {
  profile: Profile;
  request: Request;
  matches: Match[];
  chosen: string | null;
  onChoose: (id: string) => void;
  tracker: Record<string, TrackStage>;
  onTrack: (id: string, s: TrackStage | null) => void;
  onBrowse: () => void;
}) {
  const { t, lang } = useI18n();
  const m = matches.find((x) => x.opp.id === chosen) ?? null;
  const [path, setPath] = useState<Pathway | null>(null);
  const [loading, setLoading] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);

  useEffect(() => {
    if (!m) return;
    const key = `${profile.id}:${m.opp.id}:${lang}`;
    const hit = pathCache.get(key);
    if (hit) {
      setPath(hit);
      return;
    }
    let live = true;
    setPath(null);
    setLoading(true);
    fetch("/api/pathway", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profile: { ...profile, logo: undefined, banner: undefined }, request, match: m, lang }),
    })
      .then((r) => r.json())
      .then((p: Pathway) => {
        pathCache.set(key, p);
        if (live) setPath(p);
      })
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m?.opp.id, lang, profile.id]);

  const strong = matches.filter((x) => x.verdict === "strong" && x.opp.id !== m?.opp.id).slice(0, 5);

  if (!m) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-line-strong bg-card px-6 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-saffron-soft font-mono text-[18px] text-saffron-deep">?</span>
        <p className="mt-4 text-[20px] font-medium">{t("path.pick")}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {matches
            .filter((x) => x.verdict === "strong")
            .slice(0, 3)
            .map((x) => (
              <button key={x.opp.id} className={BTN_GHOST} onClick={() => onChoose(x.opp.id)}>
                <Flag code={x.opp.country} /> {x.opp.name}
              </button>
            ))}
        </div>
        <button onClick={onBrowse} className={cn(BTN_SAFFRON, "mt-4")}>
          {t("path.choose")} →
        </button>
      </div>
    );
  }

  const inTracker = !!tracker[m.opp.id];
  const colors = ["#0033a0", "#ffc300", "#d0103a", "#0e7a4b", "#7c3aed", "#0891b2"];

  return (
    <div>
      <Micro>03 · {t("path.eyebrow")}</Micro>
      <h2 className="mt-2 text-[clamp(1.6rem,3vw,2.3rem)] leading-tight font-medium tracking-[-0.02em]">{t("path.title", { name: m.opp.name })}</h2>

      <div className="nx-card mt-5 grid gap-5 p-6 md:grid-cols-[auto_1fr_auto] md:items-center">
        <ScoreRing score={m.score} verdict={m.verdict} size={76} />
        <div className="min-w-0">
          <p className="nx-micro text-ink-3">
            {TYPE_LABEL[m.opp.type]} · <Flag code={m.opp.country} /> {COUNTRIES[m.opp.country].name} · {m.opp.org}
          </p>
          <p className="mt-1.5 text-[14.5px] text-ink-2">{m.opp.summary}</p>
          <div className="mt-3">
            <Reasons m={m} max={4} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
          <div className="rounded-lg border border-line bg-paper px-3 py-2">
            <p className="nx-micro text-[10px] text-ink-3">{t("path.amount")}</p>
            <p className="font-mono text-[13px]">{m.opp.amount}</p>
          </div>
          <div className="rounded-lg border border-line bg-paper px-3 py-2">
            <p className="nx-micro text-[10px] text-ink-3">{t("path.deadline")}</p>
            <div className="mt-0.5">
              <Deadline m={m} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_300px]">
        <div className="nx-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[17px] font-medium">{t("path.eyebrow")}</p>
            {path ? (
              <span className={cn("nx-micro inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5", path.mode === "gemma" ? "border-asean/30 bg-asean-soft text-asean" : "border-line text-ink-3")}>
                <Icon name="spark" size={12} />
                {path.mode === "gemma" ? t("path.byGemma") : t("path.byRules")}
              </span>
            ) : null}
          </div>
          {loading || !path ? (
            <div className="mt-6">
              <Loading label={t("path.loading")} />
              <div className="mt-6 space-y-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-stone/70" />
                ))}
              </div>
            </div>
          ) : (
            <ol className="relative mt-6 space-y-3 border-l-2 border-dashed border-line-strong pl-6">
              {path.steps.map((s, i) => (
                <li key={i} className="nx-rise relative" style={{ ["--i" as string]: i * 2 }}>
                  <span
                    className="absolute top-3 -left-[34px] grid size-6 place-items-center rounded-full border-[3px] border-white font-mono text-[10px] text-white shadow-[0_0_0_1.5px_var(--line-strong)]"
                    style={{ background: colors[i % colors.length] }}
                  >
                    {i + 1}
                  </span>
                  <div className="rounded-lg border border-line bg-card px-4 py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-[15px] font-medium">{s.title}</p>
                      <span className="font-mono text-[11.5px] text-ink-3">{s.when}</span>
                    </div>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">{s.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="space-y-4">
          <div className="nx-card p-5">
            <p className="nx-micro text-ink-3">{t("path.docs")}</p>
            <ul className="mt-3 space-y-2">
              {(path?.documents ?? []).map((d) => (
                <li key={d} className="flex items-start gap-2 text-[13.5px]">
                  <Icon name="doc" size={15} className="mt-0.5 text-asean" />
                  {d}
                </li>
              ))}
            </ul>
          </div>
          {path?.tip ? (
            <div className="rounded-2xl border border-[#e6b000] bg-saffron-soft p-5">
              <p className="nx-micro text-saffron-deep">{t("path.tip")}</p>
              <p className="mt-2 text-[14px] leading-relaxed">{path.tip}</p>
            </div>
          ) : null}
          <div className="grid gap-2">
            <button className={BTN_SAFFRON} onClick={() => setDraftOpen(true)}>
              <Icon name="mail" size={15} />
              {t("path.intro")}
            </button>
            <button className={inTracker ? BTN_INK : BTN_GHOST} onClick={() => onTrack(m.opp.id, inTracker ? null : "saved")}>
              <Icon name={inTracker ? "check" : "bookmark"} size={15} />
              {inTracker ? t("path.tracked") : t("path.track")}
            </button>
          </div>
        </div>
      </div>

      {strong.length ? (
        <div className="mt-6">
          <p className="nx-micro text-ink-3">{t("path.other")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {strong.map((x) => (
              <button key={x.opp.id} onClick={() => onChoose(x.opp.id)} className="nx-focus inline-flex h-9 items-center gap-2 rounded-full border border-line bg-card px-3 text-[13px] hover:border-ink">
                <Flag code={x.opp.country} />
                {x.opp.name}
                <span className="font-mono text-[11px] text-good">{x.score}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <DraftModal open={draftOpen} onClose={() => setDraftOpen(false)} profile={profile} m={m} />
    </div>
  );
}

function DraftModal({ open, onClose, profile, m }: { open: boolean; onClose: () => void; profile: Profile; m: Match }) {
  const { t, lang } = useI18n();
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!open) return;
    let live = true;
    setText("");
    fetch("/api/draft", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profile: { ...profile, logo: undefined, banner: undefined }, opp: m.opp, lang }),
    })
      .then((r) => r.json())
      .then((j) => live && setText(j.draft ?? t("common.error")))
      .catch(() => live && setText(t("common.error")));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, m.opp.id, lang]);

  return (
    <Modal open={open} onClose={onClose} title={`${t("draft.title")} · ${m.opp.org}`}>
      {text ? (
        <>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} className={cn(INPUT, "mt-0 h-auto py-3 text-[14px] leading-relaxed")} />
          <button
            className={cn(BTN_SAFFRON, "mt-4")}
            onClick={() => {
              void navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            }}
          >
            <Icon name={copied ? "check" : "copy"} size={15} />
            {copied ? t("draft.copied") : t("draft.copy")}
          </button>
        </>
      ) : (
        <Loading label={t("draft.writing")} />
      )}
    </Modal>
  );
}

/* ── Tracker ───────────────────────────────────────────────── */

function Tracker({ matches, tracker, onTrack, onPath }: { matches: Match[]; tracker: Record<string, TrackStage>; onTrack: (id: string, s: TrackStage | null) => void; onPath: (id: string) => void }) {
  const { t } = useI18n();
  const byId = new Map(matches.map((m) => [m.opp.id, m]));
  const items = Object.entries(tracker)
    .map(([id, stage]) => ({ m: byId.get(id), stage }))
    .filter((x): x is { m: Match; stage: TrackStage } => !!x.m);
  const reached = (s: TrackStage) => items.filter((x) => TRACK_STAGES.indexOf(x.stage) >= TRACK_STAGES.indexOf(s)).length;
  const colors: Record<TrackStage, string> = { saved: "#0033a0", applied: "#b07400", meeting: "#d0103a", deal: "#0e7a4b" };

  return (
    <div>
      <Micro>04 · {t("tab.tracker")}</Micro>
      <h2 className="mt-2 text-[clamp(1.6rem,3vw,2.3rem)] leading-tight font-medium tracking-[-0.02em]">{t("track.title")}</h2>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {TRACK_STAGES.map((s) => (
          <div key={s} className="nx-card p-5">
            <p className="font-mono text-[34px] leading-none font-semibold" style={{ color: colors[s] }}>
              {reached(s)}
            </p>
            <p className="mt-2 text-[13.5px] text-ink-2">{t(`track.${s}`)}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone">
              <span className="nx-grow block h-full rounded-full" style={{ width: `${items.length ? (reached(s) / items.length) * 100 : 0}%`, background: colors[s] }} />
            </div>
          </div>
        ))}
      </div>
      {items.length ? <p className="mt-3 font-mono text-[12px] text-ink-3">{t("track.converted", { n: Math.round((reached("deal") / items.length) * 100) })}</p> : null}

      {items.length ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {TRACK_STAGES.map((s, si) => (
            <div key={s} className="rounded-2xl border border-line bg-paper-2 p-3">
              <p className="nx-micro flex items-center gap-2 px-1 py-1 text-ink-2">
                <span className="size-2 rounded-full" style={{ background: colors[s] }} />
                {t(`track.${s}`)}
                <span className="ml-auto font-mono text-ink-3">{items.filter((x) => x.stage === s).length}</span>
              </p>
              <div className="mt-2 space-y-2">
                {items
                  .filter((x) => x.stage === s)
                  .map(({ m }) => (
                    <div key={m.opp.id} className="nx-card nx-rise p-3">
                      <button onClick={() => onPath(m.opp.id)} className="nx-focus text-left text-[14px] leading-snug font-medium hover:underline">
                        <Flag code={m.opp.country} /> {m.opp.name}
                      </button>
                      <p className="mt-1 font-mono text-[11.5px] text-ink-3">{m.opp.amount}</p>
                      <div className="mt-3 flex gap-1.5">
                        {si < TRACK_STAGES.length - 1 ? (
                          <button className={cn(BTN_INK, "min-h-8 flex-1 px-2 text-[10.5px]")} onClick={() => onTrack(m.opp.id, TRACK_STAGES[si + 1]!)}>
                            {t(`track.${TRACK_STAGES[si + 1]}`)} →
                          </button>
                        ) : (
                          <span className="flex-1 text-[12px] text-good">✓ {t("track.deal")}</span>
                        )}
                        <button onClick={() => onTrack(m.opp.id, null)} title={t("track.remove")} className="nx-focus grid size-8 place-items-center rounded-md border border-line text-ink-3 hover:border-ink hover:text-ink">
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-10 rounded-2xl border border-dashed border-line-strong bg-card p-10 text-center text-[14px] text-ink-3">{t("track.empty")}</p>
      )}
    </div>
  );
}

/* ── Ask Nexa ──────────────────────────────────────────────── */

function Ask({ profile, request, matches }: { profile: Profile; request: Request; matches: Match[] }) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [chat, setChat] = useState<{ who: "me" | "nexa"; text: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [chat, busy]);

  const ask = async (question: string) => {
    if (!question.trim() || busy) return;
    setChat((c) => [...c, { who: "me", text: question }]);
    setQ("");
    setBusy(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, profile: { ...profile, logo: undefined, banner: undefined }, request, matches: matches.slice(0, 14) }),
      });
      const j = await res.json();
      setChat((c) => [...c, { who: "nexa", text: j.answer ?? t("common.error") }]);
    } catch {
      setChat((c) => [...c, { who: "nexa", text: t("common.error") }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Micro>05 · {t("tab.ask")}</Micro>
      <h2 className="mt-2 text-[clamp(1.6rem,3vw,2.3rem)] leading-tight font-medium tracking-[-0.02em]">{t("ask.title")}</h2>
      <p className="mt-2 text-[15px] text-ink-2">{t("ask.sub")}</p>

      <div className="nx-card mt-5 overflow-hidden">
        <div className="nx-dotgrid max-h-[460px] min-h-[260px] space-y-3 overflow-y-auto p-5">
          {chat.length === 0 ? (
            <div className="flex flex-wrap gap-2">
              {(["ask.s1", "ask.s2", "ask.s3"] as const).map((k) => (
                <button key={k} onClick={() => void ask(t(k))} className="nx-focus rounded-full border border-line bg-card px-3.5 py-2 text-[13.5px] hover:border-ink">
                  {t(k)}
                </button>
              ))}
            </div>
          ) : null}
          {chat.map((c, i) => (
            <div key={i} className={cn("flex", c.who === "me" ? "justify-end" : "justify-start")}>
              <p
                className={cn(
                  "nx-rise max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap",
                  c.who === "me" ? "rounded-br-sm bg-ink text-paper" : "rounded-bl-sm border border-line bg-card",
                )}
              >
                {c.text}
              </p>
            </div>
          ))}
          {busy ? <Loading label={t("ask.thinking")} /> : null}
          <div ref={end} />
        </div>
        <form
          className="flex gap-2 border-t border-line p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(q);
          }}
        >
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("ask.ph")} className={cn(INPUT, "mt-0 flex-1")} />
          <button type="submit" disabled={busy || !q.trim()} className={cn(BTN_SAFFRON, "min-h-11")} aria-label="Send">
            <Icon name="send" size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
