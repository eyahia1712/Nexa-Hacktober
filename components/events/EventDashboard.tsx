"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "../Icon";
import { getJson, personHeaders, post } from "@/lib/client";
import { COUNTRIES, ROLE_LABEL, ROLE_PLURAL, type EventSummary, type Participant, type Person, type Role } from "@/lib/types";
import { LiveBadge, focus } from "./EventPage";
import { EventsHeader, ROLE_TONE, SHELL, fmtRange, isLive, rolesLabel } from "./ui";

type View = "all" | Role | "matches";

/** Tab order puts what each role came for first: startups want investors and talent, investors want startups, talent wants startups. */
const LOOKS_FOR: Record<Role, Role[]> = { startup: ["vc", "talent", "startup"], vc: ["startup", "vc", "talent"], talent: ["startup", "talent", "vc"] };
/** Someone with two roles gets the tabs of both, primary role first. */
const lookingFor = (roles: Role[]) => [...new Set(roles.flatMap((r) => LOOKS_FOR[r]))];

/**
 * The event dashboard: opportunities from this room only. Everyone else at the event,
 * ranked by fit to you. "Interested" notifies them; both sides = a match with contact details.
 */
export function EventDashboard({ id }: { id: string }) {
  const [event, setEvent] = useState<EventSummary | null>(null);
  const [me, setMe] = useState<Person | null>(null);
  const [people, setPeople] = useState<Participant[] | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("all");
  const [q, setQ] = useState("");

  const load = useCallback(() => {
    getJson<{ me: Person; participants: Participant[] }>(`/api/events/${id}/participants`)
      .then((r) => {
        setMe(r.me);
        setPeople(r.participants);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    getJson<{ event: EventSummary }>(`/api/events/${id}`).then((r) => setEvent(r.event)).catch(() => {});
    load();
    // Pick up interest from other guests while the page is open.
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [id, load]);

  const interested = async (p: Participant) => {
    setPeople((xs) => xs?.map((x) => (x.id === p.id ? { ...x, interest: { ...x.interest, sent: true } } : x)) ?? null);
    try {
      await post(`/api/events/${id}/interest`, { toId: p.id }, { headers: personHeaders() });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (error && !people) {
    return (
      <div className="min-h-screen bg-paper-2">
        <EventsHeader />
        <main className={`${SHELL} py-24 text-center`}>
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-blue-soft text-blue">
            <Icon name="users" size={22} />
          </span>
          <p className="mt-4 text-[18px] font-semibold">{error}</p>
          <Link href={`/events/${id}`} className="btn btn-blue mt-6">Go to the event page</Link>
        </main>
      </div>
    );
  }

  const all = people ?? [];
  const matches = all.filter((p) => p.interest.sent && p.interest.received);
  const waiting = all.filter((p) => p.interest.received && !p.interest.sent);
  const needle = q.trim().toLowerCase();
  const shown = all.filter((p) => {
    if (view === "matches" && !(p.interest.sent && p.interest.received)) return false;
    if (view !== "all" && view !== "matches" && !p.roles.includes(view)) return false;
    return !needle || [p.name, p.org, p.note, p.sector ?? "", ...(p.sectors ?? [])].join(" ").toLowerCase().includes(needle);
  });
  const live = event ? isLive(event) : false;

  return (
    <div className="min-h-screen bg-paper-2">
      <EventsHeader />
      <main className={`${SHELL} space-y-5 py-8`}>
        <section className="box rise overflow-hidden">
          <div className="flex flex-wrap items-center gap-4 bg-ink px-5 py-5 text-white sm:px-6">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {live ? <LiveBadge /> : <span className="micro text-white/60">Event dashboard</span>}
                {event && <span className="text-[12.5px] text-white/60">{fmtRange(event)}</span>}
              </div>
              <h1 className="mt-2 text-[clamp(1.4rem,3vw,2rem)] font-semibold leading-tight tracking-[-0.02em]">{event?.title ?? "…"}</h1>
              {me && (
                <p className="mt-1 text-[13px] text-white/70">
                  You: {me.name} · {me.org} · {rolesLabel(me.roles)}
                </p>
              )}
            </div>
            <Link href={`/events/${id}`} className="btn min-h-9 border border-white/30 px-3 text-[13px] text-white hover:bg-white hover:text-ink">
              Event page
            </Link>
          </div>
          <div className="grid grid-cols-2 divide-x divide-line sm:grid-cols-4">
            <Stat n={all.length} label="people in the room" />
            <Stat n={all.filter((p) => p.fit.score >= 60).length} label="strong fits for you" tone="text-teal" />
            <Stat n={waiting.length} label="interested in you" tone="text-blue" />
            <Stat n={matches.length} label="matches" tone="text-red" />
          </div>
        </section>

        {waiting.length > 0 && (
          <section className="box border-blue/30 p-5">
            <p className="micro text-blue">Interested in you · say yes to unlock contact details</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {waiting.map((p) => (
                <Card key={p.id} p={p} onInterested={interested} />
              ))}
            </div>
          </section>
        )}

        <section className="box p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap rounded-xl border border-line bg-paper-2 p-1">
              {(
                [
                  ["all", "Everyone", all.length],
                  ...lookingFor(me?.roles ?? ["startup"]).map((r) => [r, ROLE_PLURAL[r].charAt(0).toUpperCase() + ROLE_PLURAL[r].slice(1), all.filter((p) => p.roles.includes(r)).length] as const),
                  ["matches", "Matches", matches.length],
                ] as [View, string, number][]
              ).map(([k, label, n]) => (
                <button
                  key={k}
                  onClick={() => setView(k)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${view === k ? "bg-white text-ink shadow-[0_2px_8px_-4px_rgb(0_0_0/0.3)]" : "text-ink-2 hover:text-ink"}`}
                >
                  {label} <span className="font-mono text-[11.5px] text-ink-3">{n}</span>
                </button>
              ))}
            </div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, company, sector…"
              className="h-[42px] min-w-0 flex-1 rounded-xl border border-line bg-white px-3 text-[13px] outline-none focus:border-blue sm:max-w-xs"
            />
          </div>
          {error && <p className="mt-4 rounded-lg bg-red-soft px-4 py-3 text-[13px] font-semibold text-red">{error}</p>}
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {shown.map((p, i) => (
              <Card key={p.id} p={p} i={i} onInterested={interested} />
            ))}
            {people && !shown.length && (
              <p className="col-span-full py-10 text-center text-[14px] text-ink-3">
                {view === "matches" ? "No matches yet. Press Interested on people you want to meet." : "Nobody here yet."}
              </p>
            )}
            {!people && [0, 1, 2, 3].map((k) => <div key={k} className="h-40 animate-pulse rounded-2xl bg-stone" />)}
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ n, label, tone = "text-ink" }: { n: number; label: string; tone?: string }) {
  return (
    <div className="border-t border-line px-5 py-4">
      <p className={`font-mono text-[28px] font-semibold leading-none ${tone}`}>{n}</p>
      <p className="mt-1 text-[12px] text-ink-3">{label}</p>
    </div>
  );
}

function Card({ p, i = 0, onInterested }: { p: Participant; i?: number; onInterested: (p: Participant) => void }) {
  const mutual = p.interest.sent && p.interest.received;
  const tone = p.fit.score >= 60 ? "bg-teal-soft text-teal-deep" : p.fit.score > 0 ? "bg-gold-soft text-gold-deep" : "bg-stone text-ink-3";
  return (
    <article className={`box box-lift rise flex flex-col p-4 ${mutual ? "border-teal" : ""}`} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
      <div className="flex items-start gap-3">
        <span className={`grid size-11 shrink-0 place-items-center rounded-full text-[16px] font-bold ${ROLE_TONE[p.role]}`}>{p.name.charAt(0)}</span>
        <div className="min-w-0 flex-1">
          <p className="micro flex items-center gap-1.5 text-ink-3">
            <span className="text-[13px]">{COUNTRIES[p.country].flag}</span> {rolesLabel(p.roles)}
          </p>
          <h3 className="mt-0.5 text-[15.5px] font-semibold leading-snug">{p.org}</h3>
          <p className="text-[12.5px] text-ink-3">{p.name}{p.ticket ? ` · ${p.ticket}` : ""}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[12px] font-semibold ${tone}`} title="Fit with you">{p.fit.score}</span>
      </div>
      {p.note && <p className="mt-3 text-[13px] leading-snug text-ink-2">{p.note}</p>}
      <p className="mt-2 text-[12px] text-ink-3">{focus(p)}</p>
      {p.fit.reasons.length > 0 && (
        <ul className="mt-2 flex-1 space-y-1">
          {p.fit.reasons.map((r) => (
            <li key={r} className="flex items-start gap-1.5 text-[12.5px] text-ink-2">
              <span className="mt-px grid size-4 shrink-0 place-items-center rounded-full bg-teal-soft text-teal">
                <Icon name="check" size={10} stroke={3} />
              </span>
              {r}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 border-t border-line pt-3">
        {mutual ? (
          <a href={`mailto:${p.email}`} className="btn min-h-9 w-full bg-teal px-3 text-[13px] text-white hover:bg-teal-deep">
            <Icon name="mail" size={15} /> Match · {p.email}
          </a>
        ) : p.interest.sent ? (
          <p className="flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-soft text-[13px] font-semibold text-blue">
            <Icon name="check" size={14} stroke={2.6} /> Interest sent · waiting for {p.name.split(" ")[0]}
          </p>
        ) : (
          <button onClick={() => onInterested(p)} className="btn btn-blue min-h-9 w-full px-3 text-[13px]">
            <Icon name="spark" size={15} /> {p.interest.received ? "Interested back" : "Interested"}
          </button>
        )}
      </div>
    </article>
  );
}
