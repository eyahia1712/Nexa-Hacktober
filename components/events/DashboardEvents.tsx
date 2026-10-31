"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Icon } from "@/components/Icon";
import { BTN_GHOST, BTN_SAFFRON, Micro } from "@/components/ui";
import { getJson, personHeaders, post } from "@/lib/client";
import { COUNTRIES, ROLE_PLURAL, type EventRec, type EventSummary, type Person } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DateTile, fmtRange, isLive } from "./ui";

type MeData = { person: Person; going: EventSummary[]; recommended: EventRec[] };

/** Dashboard tab 06: the company's events, and events picked for it, without leaving the dashboard. */
export function DashboardEvents({ company }: { company: string }) {
  const [data, setData] = useState<MeData | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    getJson<MeData>("/api/me")
      .then(setData)
      .catch(() => setMissing(true));
  }, []);
  useEffect(load, [load]);

  const register = async (id: string) => {
    setBusy(id);
    setError("");
    try {
      await post(`/api/events/${id}/register`, {}, { headers: personHeaders() });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(null);
  };

  if (missing) {
    return (
      <div className="nx-card p-6">
        <Micro>06 · Events</Micro>
        <p className="mt-2 text-[17px] font-medium">Join events as {company}</p>
        <p className="mt-1 text-[14px] text-ink-2">Pick an event and register once; your details are filled in from this company.</p>
        <Link href="/events" className={cn(BTN_SAFFRON, "mt-4")}>
          Browse events <Icon name="arrow" size={15} />
        </Link>
      </div>
    );
  }
  if (!data) return <div className="h-48 animate-pulse rounded-2xl bg-stone" />;

  return (
    <div className="space-y-5">
      <div className="nx-card p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Micro>06 · Events · as {data.person.org}</Micro>
            <p className="mt-1 text-[20px] font-medium">Your events</p>
          </div>
          <div className="flex gap-2">
            <Link href="/events" className={BTN_GHOST}>All events</Link>
            <Link href="/events/new" className={BTN_GHOST}>
              <Icon name="plus" size={14} /> Host one
            </Link>
          </div>
        </div>
        <div className="mt-4 space-y-2.5">
          {data.going.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3">
              <DateTile start={e.start} />
              <div className="min-w-0 flex-1">
                <Link href={`/events/${e.id}`} className="text-[15px] font-medium hover:text-asean">{e.title}</Link>
                <p className="text-[12.5px] text-ink-3">
                  {fmtRange(e)} · {e.audience.map((r) => `${e.counts[r]} ${ROLE_PLURAL[r]}`).join(" · ")}
                </p>
              </div>
              <Link href={`/events/${e.id}/live`} className={isLive(e) ? cn(BTN_SAFFRON, "min-h-9") : cn(BTN_GHOST, "min-h-9")}>
                {isLive(e) ? "Live dashboard" : "Who's coming"} <Icon name="arrow" size={14} />
              </Link>
            </div>
          ))}
          {!data.going.length && <p className="text-[14px] text-ink-3">Not registered for anything yet. Start with the picks below.</p>}
        </div>
      </div>

      <div className="nx-card p-5 md:p-6">
        <Micro>Picked for {data.person.org}</Micro>
        <p className="mt-1 text-[20px] font-medium">Rooms where the right people will be</p>
        {error && <p className="mt-3 rounded-lg bg-red-soft px-4 py-3 text-[13px] font-semibold text-red">{error}</p>}
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {data.recommended.map(({ event: e, fit }) => (
            <article key={e.id} className="flex flex-col rounded-xl border border-line bg-card p-4">
              <div className="flex items-start gap-3">
                <DateTile start={e.start} />
                <div className="min-w-0 flex-1">
                  <Link href={`/events/${e.id}`} className="text-[15px] leading-snug font-medium hover:text-asean">{e.title}</Link>
                  <p className="mt-0.5 text-[12px] text-ink-3">
                    {e.format === "online" ? "Online" : `${COUNTRIES[e.country].flag} ${e.city}`} · {e.host}
                  </p>
                </div>
                <span className="rounded-full bg-teal-soft px-2 py-0.5 font-mono text-[12px] text-teal-deep">{fit.score}</span>
              </div>
              <ul className="mt-3 flex-1 space-y-1">
                {fit.reasons.map((r) => (
                  <li key={r} className="flex items-start gap-1.5 text-[13px] text-ink-2">
                    <Icon name="check" size={13} stroke={2.6} className="mt-0.5 text-teal" /> {r}
                  </li>
                ))}
              </ul>
              <button onClick={() => register(e.id)} disabled={busy === e.id} className={cn(BTN_SAFFRON, "mt-3 w-full")}>
                {busy === e.id ? "Registering…" : "One-click register"}
              </button>
            </article>
          ))}
          {!data.recommended.length && <p className="col-span-full text-[14px] text-ink-3">No other upcoming events fit {data.person.org} right now.</p>}
        </div>
      </div>
    </div>
  );
}
