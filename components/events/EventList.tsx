"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "../Icon";
import { getJson, personHeaders, sectorLabel, store } from "@/lib/client";
import { COUNTRIES, ROLE_LABEL, ROLE_PLURAL, ROLES, type Country, type EventRec, type EventSummary, type Role } from "@/lib/types";
import { DateTile, EventsHeader, HOSTING_KEY, ROLE_TEXT, ROLE_TONE, SHELL, fmtDay, fmtTime, isLive, isPast } from "./ui";

export function EventList() {
  const [events, setEvents] = useState<EventSummary[] | null>(null);
  const [error, setError] = useState("");
  const [country, setCountry] = useState<Country | "all">("all");
  const [role, setRole] = useState<Role | "all">("all");
  const [showPast, setShowPast] = useState(false);
  const [hosting, setHosting] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<EventRec[]>([]);

  useEffect(() => {
    setHosting(store.get(HOSTING_KEY, {}));
    getJson<{ events: EventSummary[] }>("/api/events")
      .then((j) => setEvents(j.events))
      .catch(() => setError("Couldn't load events."));
    if (personHeaders()["x-person-key"]) getJson<{ recommended: EventRec[] }>("/api/me").then((r) => setPicked(r.recommended.slice(0, 3))).catch(() => {});
  }, []);

  const shown = (events ?? []).filter(
    (e) => (country === "all" || e.country === country) && (role === "all" || e.audience.includes(role)) && showPast === isPast(e),
  );
  const byDay = shown.reduce<Record<string, EventSummary[]>>((acc, e) => ((acc[e.start.slice(0, 10)] ??= []).push(e), acc), {});
  const days = Object.keys(byDay).sort((a, b) => (showPast ? b.localeCompare(a) : a.localeCompare(b)));
  const used = [...new Set((events ?? []).map((e) => e.country))];

  return (
    <div className="min-h-screen bg-white">
      <EventsHeader />
      <main className={`${SHELL} py-10 md:py-14`}>
        <p className="micro text-ink-3">Startup ASEAN · Events</p>
        <h1 className="mt-3 text-[clamp(2rem,4.4vw,3.2rem)] font-semibold leading-[1.04] tracking-[-0.035em]">
          Rooms where <span className="text-blue">founders meet funders.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-ink-2">
          Register as a startup or an investor. Hosts see who fits whom before the doors open, and track every intro until it becomes a deal.
        </p>

        {picked.length > 0 && (
          <section className="mt-8">
            <p className="micro text-ink-3">Picked for you</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {picked.map(({ event: e, fit }) => (
                <Link key={e.id} href={`/events/${e.id}`} className="box box-lift p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-[11.5px] text-ink-3">{fmtDay(e.start)} · {fmtTime(e.start)}</p>
                    <span className="rounded-full bg-teal-soft px-2 py-0.5 font-mono text-[11.5px] font-semibold text-teal-deep">{fit.score}</span>
                  </div>
                  <p className="mt-1.5 text-[15px] font-semibold leading-snug">{e.title}</p>
                  <p className="mt-1.5 text-[12.5px] text-teal-deep">{fit.reasons.slice(-2).join(" · ")}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-line bg-paper-2 p-1">
            {([["all", "Everyone"], ["startup", "For startups"], ["vc", "For investors"], ["talent", "For talent"]] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setRole(k)}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${role === k ? "bg-white text-ink shadow-[0_2px_8px_-4px_rgb(0_0_0/0.3)]" : "text-ink-2 hover:text-ink"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value as Country | "all")}
            className="h-[42px] rounded-xl border border-line bg-white px-3 text-[13px] font-semibold text-ink outline-none focus:border-blue"
          >
            <option value="all">All countries</option>
            {used.map((c) => (
              <option key={c} value={c}>{COUNTRIES[c].flag} {COUNTRIES[c].name}</option>
            ))}
          </select>
          <button onClick={() => setShowPast(!showPast)} className="micro ml-auto px-2 py-2 text-ink-2 hover:text-blue">
            {showPast ? "← Upcoming" : "Past events"}
          </button>
        </div>

        {error && <p className="mt-6 rounded-lg bg-red-soft px-4 py-3 text-[13px] font-semibold text-red">{error}</p>}
        {!events && !error && (
          <div className="mt-8 space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-stone" />)}
          </div>
        )}

        <div className="mt-8 space-y-8">
          {days.map((day) => (
            <section key={day} className="grid gap-3 md:grid-cols-[140px_1fr]">
              <p className="micro pt-4 text-ink-3">{fmtDay(`${day}T00:00`)}</p>
              <div className="space-y-3">
                {byDay[day].map((e, i) => (
                  <EventRow key={e.id} e={e} i={i} hosting={!!hosting[e.id]} />
                ))}
              </div>
            </section>
          ))}
          {events && !shown.length && (
            <section className="box grid place-items-center px-6 py-16 text-center">
              <span className="grid size-12 place-items-center rounded-2xl bg-blue-soft text-blue">
                <Icon name="calendar" size={22} />
              </span>
              <p className="mt-4 text-[16px] font-semibold">No events here yet</p>
              <Link href="/events/new" className="btn btn-blue mt-5 min-h-10 text-[13px]">
                <Icon name="plus" size={15} /> Host one
              </Link>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function EventRow({ e, i, hosting }: { e: EventSummary; i: number; hosting: boolean }) {
  const full = e.capacity !== null && ROLES.reduce((n, r) => n + e.counts[r], 0) >= e.capacity;
  return (
    <Link
      href={`/events/${e.id}`}
      className="box box-lift rise flex items-start gap-4 p-4 sm:p-5 focus-visible:outline-2 focus-visible:outline-blue"
      style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
    >
      <DateTile start={e.start} />
      <div className="min-w-0 flex-1">
        <p className="micro flex flex-wrap items-center gap-x-2 text-ink-3">
          <span className="inline-flex items-center gap-1"><Icon name="clock" size={13} /> {fmtTime(e.start)}</span>
          <span>·</span>
          <span>{e.format === "online" ? "Online" : `${COUNTRIES[e.country].flag} ${e.city || COUNTRIES[e.country].name}`}</span>
        </p>
        <h2 className="mt-1.5 text-[17px] font-semibold leading-snug">{e.title}</h2>
        <p className="mt-0.5 text-[13px] text-ink-3">By {e.host}</p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {e.audience.map((r) => (
            <span key={r} className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${ROLE_TONE[r]}`}>{ROLE_LABEL[r]}</span>
          ))}
          {e.sectors !== "any" &&
            e.sectors.slice(0, 3).map((s) => (
              <span key={s} className="rounded-full border border-line px-2.5 py-0.5 text-[11.5px] text-ink-2">{sectorLabel(s)}</span>
            ))}
          {hosting && <span className="rounded-full bg-gold-soft px-2.5 py-0.5 text-[11.5px] font-semibold text-gold-deep">Hosting</span>}
          {isLive(e) && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red px-2.5 py-0.5 text-[11.5px] font-semibold text-white">
              <span className="blink size-1.5 rounded-full bg-white" /> Live
            </span>
          )}
          {e.going && (
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-soft px-2.5 py-0.5 text-[11.5px] font-semibold text-teal-deep">
              <Icon name="check" size={11} stroke={3} /> Going
            </span>
          )}
        </div>
      </div>
      <div className="hidden shrink-0 text-right sm:block">
        {e.audience.map((r) => (
          <p key={r} className="font-mono text-[13px] font-semibold">
            <span className={ROLE_TEXT[r]}>{e.counts[r]}</span> <span className="text-ink-3">{ROLE_PLURAL[r]}</span>
          </p>
        ))}
        {full ? (
          <p className="mt-1 font-mono text-[11px] font-semibold text-red">Full</p>
        ) : e.outcomes.meeting > 0 ? (
          <p className="mt-1 font-mono text-[11px] text-ink-3">{e.outcomes.meeting} meetings booked</p>
        ) : null}
      </div>
    </Link>
  );
}
