"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "../Icon";
import { getJson, PERSON_KEY, personHeaders, post, sectorLabel, store } from "@/lib/client";
import type { Intro } from "@/lib/eventMatch";
import {
  COUNTRIES,
  INTRO_STAGES,
  ROLE_LABEL,
  ROLE_PLURAL,
  ROLES,
  SENIORITY_LABEL,
  SKILL_LABEL,
  STAGE_LABEL,
  type EventSummary,
  type Fit,
  type IntroStatus,
  type Person,
  type Registration,
  type Role,
} from "@/lib/types";
import { PersonForm } from "./PersonForm";
import { DateTile, EventsHeader, HOSTING_KEY, ROLE_TEXT, ROLE_TONE, RolePills, SHELL, fmtRange, isLive, isPast, rolesLabel } from "./ui";

type HostData = { registrations: Registration[]; intros: Intro[] };
type Me = { person: Person; registered: boolean; fit: number };
const DEMO_KEY = "demo";

export function EventPage({ id }: { id: string }) {
  const [event, setEvent] = useState<EventSummary | null>(null);
  const [host, setHost] = useState<HostData | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [missing, setMissing] = useState(false);
  const [key, setKey] = useState<string | null>(null);

  const load = useCallback(
    async (k: string | null) => {
      const res = await fetch(`/api/events/${id}`, { headers: { ...personHeaders(), ...(k ? { "x-host-key": k } : {}) } });
      if (res.status === 404) return setMissing(true);
      const j = (await res.json()) as { event: EventSummary; host: HostData | null; me: Me | null };
      setEvent(j.event);
      setHost(j.host);
      setMe(j.me);
    },
    [id],
  );

  useEffect(() => {
    const k = store.get<Record<string, string>>(HOSTING_KEY, {})[id] ?? null;
    setKey(k);
    load(k);
  }, [id, load]);

  const viewAsDemoHost = () => {
    store.set(HOSTING_KEY, { ...store.get(HOSTING_KEY, {}), [id]: DEMO_KEY });
    setKey(DEMO_KEY);
    load(DEMO_KEY);
  };

  if (missing) {
    return (
      <div className="min-h-screen bg-white">
        <EventsHeader />
        <main className={`${SHELL} py-24 text-center`}>
          <p className="text-[18px] font-semibold">This event doesn&apos;t exist.</p>
          <Link href="/events" className="btn btn-line mt-6">All events</Link>
        </main>
      </div>
    );
  }
  if (!event) {
    return (
      <div className="min-h-screen bg-white">
        <EventsHeader />
        <main className={`${SHELL} py-10`}><div className="h-64 animate-pulse rounded-2xl bg-stone" /></main>
      </div>
    );
  }

  const taken = ROLES.reduce((n, r) => n + event.counts[r], 0);
  const full = event.capacity !== null && taken >= event.capacity;
  const past = isPast(event);
  const live = isLive(event);

  return (
    <div className="min-h-screen bg-paper-2">
      <EventsHeader />
      <main className={`${SHELL} space-y-5 py-8`}>
        <div className="grid items-start gap-5 lg:grid-cols-[1fr_400px]">
          <article className="box rise overflow-hidden">
            <div className="relative overflow-hidden bg-blue px-6 pb-7 pt-8 text-white sm:px-8">
              <svg className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 opacity-25" viewBox="0 0 40 40" aria-hidden>
                <path d="M9 34 V19 a11 11 0 0 1 22 0 V34 Z" fill="#fff" />
                <path d="M13.5 34 V19.5 a6.5 6.5 0 0 1 13 0 V34 Z" fill="#d0103a" />
                <path d="M17 34 L20 24 L23 34 Z" fill="#e9a41c" />
              </svg>
              <p className="micro text-white/70">{event.host}</p>
              <h1 className="relative mt-2 max-w-xl text-[clamp(1.7rem,3.4vw,2.4rem)] font-semibold leading-tight tracking-[-0.03em]">{event.title}</h1>
              <div className="relative mt-4 flex flex-wrap gap-1.5">
                {live && <LiveBadge />}
                {event.audience.map((r) => (
                  <span key={r} className="rounded-full bg-white/15 px-2.5 py-0.5 text-[12px] font-semibold">{ROLE_LABEL[r]}</span>
                ))}
                {event.sample && <span className="rounded-full bg-gold px-2.5 py-0.5 text-[12px] font-semibold text-ink">Demo event</span>}
              </div>
            </div>
            <div className="space-y-4 p-6 sm:p-8">
              <div className="flex items-center gap-4">
                <DateTile start={event.start} big />
                <div>
                  <p className="text-[15px] font-semibold">{fmtRange(event)}</p>
                  <p className="text-[13px] text-ink-3">Local time in {COUNTRIES[event.country].name}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="grid size-16 shrink-0 place-items-center rounded-xl border border-line text-ink-2">
                  <Icon name={event.format === "online" ? "globe" : "pin"} size={24} />
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold">
                    {event.format === "online" ? "Online" : `${COUNTRIES[event.country].flag} ${[event.city, COUNTRIES[event.country].name].filter(Boolean).join(", ")}`}
                  </p>
                  {/* Join links only reach guests and the host: the API blanks them for everyone else. */}
                  <p className="break-words text-[13px] text-ink-3">
                    {event.venue || (event.format === "online" ? "Link shown after you register" : "Venue to be announced")}
                  </p>
                </div>
              </div>
              {event.description && <p className="whitespace-pre-wrap break-words border-t border-line pt-5 text-[14.5px] leading-relaxed text-ink-2">{event.description}</p>}
              {event.sectors !== "any" && (
                <div className="flex flex-wrap gap-1.5">
                  {event.sectors.map((s) => (
                    <span key={s} className="rounded-full border border-line px-2.5 py-1 text-[12px] text-ink-2">{sectorLabel(s)}</span>
                  ))}
                </div>
              )}
            </div>
          </article>

          <aside className="space-y-5 lg:sticky lg:top-20">
            <section className="box p-5">
              <p className="micro text-ink-3">Who&apos;s coming</p>
              <div className={`mt-3 grid gap-3 ${event.audience.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                {event.audience.map((r) => (
                  <div key={r} className="rounded-xl border border-line p-3">
                    <p className={`font-mono text-[28px] font-semibold leading-none ${ROLE_TEXT[r]}`}>{event.counts[r]}</p>
                    <p className="mt-1 text-[12px] text-ink-3">{ROLE_PLURAL[r]}</p>
                  </div>
                ))}
              </div>
              {event.capacity !== null && (
                <>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone">
                    <span className="block h-full rounded-full bg-blue" style={{ width: `${Math.min(100, (taken / event.capacity) * 100)}%` }} />
                  </div>
                  <p className="mt-1.5 font-mono text-[11px] text-ink-3">{taken} / {event.capacity} spots taken</p>
                </>
              )}
              {event.outcomes.sent + event.outcomes.talent > 0 && (
                <p className="mt-3 flex items-center gap-1.5 text-[12.5px] font-semibold text-teal-deep">
                  <Icon name="spark" size={13} /> {event.outcomes.sent} intros · {event.outcomes.meeting} meetings · {event.outcomes.deal} deals · {event.outcomes.talent} talent matches
                </p>
              )}
            </section>

            {me?.registered ? (
              <YoureIn me={me} event={event} live={live} />
            ) : past ? (
              <section className="box p-5 text-center text-[14px] font-semibold text-ink-3">This event has ended.</section>
            ) : full ? (
              <section className="box p-5 text-center text-[14px] font-semibold text-red">This event is full.</section>
            ) : me ? (
              <OneClick event={event} person={me.person} onDone={() => load(key)} />
            ) : (
              <RegisterCard event={event} />
            )}

            {!host && event.sample && (
              <button onClick={viewAsDemoHost} className="micro w-full rounded-xl border border-dashed border-line-strong py-3 text-ink-2 transition hover:border-blue hover:text-blue">
                Demo: open the host view
              </button>
            )}
          </aside>
        </div>

        {host && key && (
          <>
            <HostPanel event={event} data={host} hostKey={key} onChange={() => load(key)} />
            <FindParticipants eventId={event.id} hostKey={key} />
          </>
        )}
      </main>
    </div>
  );
}

export function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red px-2.5 py-0.5 text-[12px] font-semibold text-white">
      <span className="blink size-1.5 rounded-full bg-white" /> Live today
    </span>
  );
}

// ── Guest side ───────────────────────────────────────────────
function YoureIn({ me, event, live }: { me: Me; event: EventSummary; live: boolean }) {
  return (
    <section className="box rise p-5">
      <span className="grid size-11 place-items-center rounded-xl bg-teal text-white">
        <Icon name="check" size={22} stroke={2.6} />
      </span>
      <p className="mt-3 text-[18px] font-semibold">You&apos;re in.</p>
      <p className="mt-1 text-[13px] text-ink-2">
        {me.person.name} · {me.person.org} · {rolesLabel(me.person.roles).toLowerCase()}
      </p>
      <div className="mt-4 rounded-xl border border-line bg-paper-2 p-3.5">
        <p className="font-mono text-[24px] font-semibold leading-none text-blue">{me.fit}</p>
        <p className="mt-1 text-[12.5px] text-ink-2">{me.person.roles.length > 1 ? "people here fit you" : FIT_TEXT[me.person.role]}</p>
      </div>
      <Link href={`/events/${event.id}/live`} className={`btn mt-4 w-full ${live ? "bg-red text-white hover:bg-red/90" : "btn-blue"}`}>
        {live ? "Open live dashboard" : "See who's coming"} <Icon name="arrow" size={16} />
      </Link>
    </section>
  );
}

const FIT_TEXT: Record<Role, string> = {
  startup: "investors and talent here fit you",
  vc: "startups here fit your thesis",
  talent: "startups here are hiring your skills, plus possible teammates",
};

/** A known person registers with their saved profile in one click. */
function OneClick({ event, person, onDone }: { event: EventSummary; person: Person; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!person.roles.some((r) => event.audience.includes(r))) {
    return <section className="box p-5 text-center text-[14px] font-semibold text-ink-3">This event isn&apos;t open to {ROLE_PLURAL[person.role]}.</section>;
  }
  return (
    <section className="box p-5">
      <p className="text-[17px] font-semibold">Register</p>
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-line p-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-full text-[15px] font-bold ${ROLE_TONE[person.role]}`}>{person.name.charAt(0)}</span>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold">{person.name}</p>
          <p className="truncate text-[12.5px] text-ink-3">{person.org} · {rolesLabel(person.roles)}</p>
        </div>
        <Link href="/me" className="micro ml-auto text-ink-3 hover:text-blue">Edit</Link>
      </div>
      {error && <p className="mt-3 rounded-lg bg-red-soft px-4 py-3 text-[13px] font-semibold text-red">{error}</p>}
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await post(`/api/events/${event.id}/register`, {}, { headers: personHeaders() });
            onDone();
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        }}
        className="btn btn-blue mt-4 w-full"
      >
        {busy ? "Registering…" : <>One-click register <Icon name="arrow" size={16} /></>}
      </button>
    </section>
  );
}

function RegisterCard({ event }: { event: EventSummary }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <section className="box p-5">
      <p className="mb-3 text-[17px] font-semibold">Register</p>
      <PersonForm
        roles={event.audience}
        country={event.country}
        busy={busy}
        error={error}
        submit={(roles) => <>Register as {rolesLabel(roles).toLowerCase() || "…"} <Icon name="arrow" size={16} /></>}
        onSubmit={async (v) => {
          setBusy(true);
          setError("");
          try {
            const r = await post<{ personKey: string }>(`/api/events/${event.id}/register`, v);
            store.set(PERSON_KEY, r.personKey);
            // Reload so the header bell and every page know who you are now.
            window.location.reload();
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        }}
      />
    </section>
  );
}

// ── Host side ────────────────────────────────────────────────
const INTRO_COLOR: Record<IntroStatus, string> = { suggested: "#9fc3e6", sent: "#2f5bd3", meeting: "#e9a41c", deal: "#0e9f9a" };

function HostPanel({ event, data, hostKey, onChange }: { event: EventSummary; data: HostData; hostKey: string; onChange: () => void }) {
  const [intros, setIntros] = useState(data.intros);
  const [filter, setFilter] = useState<Role | "all">("all");
  const [error, setError] = useState("");
  useEffect(() => setIntros(data.intros), [data.intros]);

  const move = async (i: Intro, status: IntroStatus) => {
    setError("");
    setIntros((xs) => xs.map((x) => (x.startup.id === i.startup.id && x.vc.id === i.vc.id ? { ...x, status } : x)));
    try {
      const res = await fetch(`/api/events/${event.id}/intros`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-host-key": hostKey },
        body: JSON.stringify({ startupId: i.startup.id, vcId: i.vc.id, status }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    } catch (e) {
      setError((e as Error).message || "Couldn't save.");
    }
    onChange();
  };

  const order = INTRO_STAGES.map((s) => s.id);
  const reached = (s: IntroStatus) => intros.filter((i) => order.indexOf(i.status) >= order.indexOf(s)).length;
  const guests = data.registrations.filter((r) => filter === "all" || r.roles.includes(filter));

  const csv = () => {
    const rows = [
      ["role", "name", "email", "org", "country", "sector / focus", "stage / stages", "ticket", "skills / hiring", "note"],
      ...data.registrations.map((r) => [
        r.roles.join("+"), r.name, r.email, r.org, COUNTRIES[r.country].name,
        [r.sector ?? "", ...(r.sectors ?? [])].filter(Boolean).join(" "),
        [r.stage ?? "", ...(r.stages ?? [])].filter(Boolean).join(" "),
        r.ticket ?? "", [...(r.skills ?? []), ...(r.hiring ?? []).map((k) => `hiring:${k}`)].join(" "), r.note,
      ]),
    ];
    const text = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    a.download = `${event.id}-guests.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <section className="box p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="micro text-gold-deep">Host view · only you see this</p>
            <h2 className="mt-1 text-[22px] font-semibold tracking-tight">From guest list to deals</h2>
          </div>
          <p className="max-w-sm text-[12.5px] text-ink-3">Rules pair each startup with investors here who back its sector and stage. Mutual interest on the event dashboard marks an intro as sent automatically.</p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {INTRO_STAGES.map((s, i) => {
            const n = reached(s.id);
            const prev = i > 0 ? reached(order[i - 1]) : 0;
            return (
              <div key={s.id} className="rounded-xl border border-line p-4">
                <p className="micro flex items-center gap-1.5 text-ink-3">
                  <span className="size-2 rounded-full" style={{ background: INTRO_COLOR[s.id] }} /> {s.label}
                </p>
                <p className="mt-2 font-mono text-[30px] font-semibold leading-none">{n}</p>
                {i > 0 && <p className="mt-2 font-mono text-[11px] text-ink-3">{prev ? Math.round((n / prev) * 100) : 0}% converted</p>}
              </div>
            );
          })}
        </div>

        {error && <p className="mt-4 rounded-lg bg-red-soft px-4 py-3 text-[13px] font-semibold text-red">{error}</p>}
        <div className="mt-5 space-y-2.5">
          {intros.map((i) => (
            <div
              key={`${i.startup.id}:${i.vc.id}`}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white p-3.5"
              style={{ borderLeft: `3px solid ${INTRO_COLOR[i.status]}` }}
            >
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 text-[14px] font-semibold">
                  <span className="text-blue">{i.startup.org}</span>
                  <Icon name="arrow" size={14} className="text-ink-3" />
                  <span className="text-teal-deep">{i.vc.org}</span>
                  <span className="font-mono text-[11.5px] font-normal text-ink-3">{i.score}</span>
                </p>
                <p className="mt-0.5 text-[12.5px] text-ink-3">
                  {COUNTRIES[i.startup.country].flag} {i.startup.name} · {COUNTRIES[i.vc.country].flag} {i.vc.name} · {i.reasons.join(" · ")}
                </p>
              </div>
              <div className="flex flex-wrap rounded-lg border border-line bg-paper-2 p-0.5">
                {INTRO_STAGES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => i.status !== s.id && move(i, s.id)}
                    aria-pressed={i.status === s.id}
                    className={`rounded-md px-2.5 py-1 text-[11.5px] font-semibold transition ${i.status === s.id ? "bg-white text-ink shadow-[0_2px_8px_-4px_rgb(0_0_0/0.3)]" : "text-ink-3 hover:text-ink"}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {!intros.length && (
            <p className="rounded-xl border border-dashed border-line-strong py-8 text-center text-[13px] text-ink-3">
              No pairs yet. Intros appear once startups and investors with matching sectors and stages register.
            </p>
          )}
        </div>
      </section>

      <section className="box p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-[18px] font-semibold tracking-tight">
            <Icon name="users" size={18} className="mr-1.5 inline -translate-y-px" />
            Guests <span className="font-mono text-[14px] text-ink-3">{data.registrations.length}</span>
          </h2>
          <div className="ml-auto flex rounded-xl border border-line bg-paper-2 p-1">
            {(["all", ...ROLES] as const).map((k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`rounded-lg px-3 py-1 text-[12.5px] font-semibold transition ${filter === k ? "bg-white text-ink shadow-[0_2px_8px_-4px_rgb(0_0_0/0.3)]" : "text-ink-2 hover:text-ink"}`}
              >
                {k === "all" ? "All" : cap(ROLE_PLURAL[k])}
              </button>
            ))}
          </div>
          <button onClick={csv} disabled={!data.registrations.length} className="btn btn-line min-h-9 text-[13px]">
            <Icon name="download" size={15} /> CSV
          </button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead>
              <tr className="micro border-b border-line text-ink-3">
                <th className="py-2 pr-3 font-semibold">Guest</th>
                <th className="py-2 pr-3 font-semibold">Role</th>
                <th className="py-2 pr-3 font-semibold">Organisation</th>
                <th className="py-2 pr-3 font-semibold">Focus</th>
                <th className="py-2 font-semibold">Note</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((r) => (
                <tr key={r.id} className="border-b border-line align-top last:border-0">
                  <td className="py-2.5 pr-3">
                    <p className="font-semibold">{r.name}</p>
                    <p className="text-[12px] text-ink-3">{r.email}</p>
                  </td>
                  <td className="py-2.5 pr-3">
                    <RolePills roles={r.roles} />
                  </td>
                  <td className="py-2.5 pr-3">
                    {COUNTRIES[r.country].flag} {r.org}
                    {r.ticket && <p className="font-mono text-[11.5px] text-ink-3">{r.ticket}</p>}
                  </td>
                  <td className="py-2.5 pr-3 text-ink-2">{focus(r)}</td>
                  <td className="py-2.5 text-ink-2">{r.note || "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!guests.length && <p className="py-8 text-center text-[13px] text-ink-3">No one yet. Share the event link.</p>}
        </div>
      </section>
    </>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** One line on what a person is about: one part per role they play. */
export const focus = (r: Pick<Person, "role" | "roles" | "sector" | "stage" | "sectors" | "stages" | "hiring" | "skills" | "seniority">) =>
  (r.roles?.length ? r.roles : [r.role]).map((role) => focusAs(role, r)).join("  |  ");

const focusAs = (role: Role, r: Pick<Person, "sector" | "stage" | "sectors" | "stages" | "hiring" | "skills" | "seniority">) =>
  role === "startup"
    ? [sectorLabel(r.sector ?? ""), r.stage ? STAGE_LABEL[r.stage] : "", r.hiring?.length ? `hiring ${r.hiring.map((k) => SKILL_LABEL[k]).join(", ")}` : ""].filter(Boolean).join(" · ")
    : role === "vc"
      ? `${(r.sectors ?? []).map(sectorLabel).join(", ")} · ${(r.stages ?? []).map((s) => STAGE_LABEL[s]).join(", ")}`
      : [(r.skills ?? []).map((k) => SKILL_LABEL[k]).join(", "), r.seniority ? SENIORITY_LABEL[r.seniority] : "", r.sectors?.length ? `into ${r.sectors.map(sectorLabel).join(", ")}` : "any sector"]
          .filter(Boolean)
          .join(" · ");

type Candidate = Omit<Person, "email" | "createdAt"> & { fit: Fit; invited: boolean };

/** Organiser: people on Nexa who aren't registered yet, best fit first, with one-click invites. */
function FindParticipants({ eventId, hostKey }: { eventId: string; hostKey: string }) {
  const [list, setList] = useState<Candidate[] | null>(null);
  const [role, setRole] = useState<Role | "all">("all");
  const [error, setError] = useState("");

  useEffect(() => {
    getJson<{ candidates: Candidate[] }>(`/api/events/${eventId}/candidates`, { "x-host-key": hostKey })
      .then((r) => setList(r.candidates))
      .catch((e) => setError(e.message));
  }, [eventId, hostKey]);

  const invite = async (c: Candidate) => {
    setList((xs) => xs?.map((x) => (x.id === c.id ? { ...x, invited: true } : x)) ?? null);
    try {
      await post(`/api/events/${eventId}/invite`, { personId: c.id }, { headers: { "x-host-key": hostKey } });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const shown = (list ?? []).filter((c) => role === "all" || c.roles.includes(role));
  return (
    <section className="box p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="micro text-gold-deep">Host view · find participants</p>
          <h2 className="mt-1 text-[22px] font-semibold tracking-tight">Who should be in this room</h2>
          <p className="mt-1 text-[12.5px] text-ink-3">Founders and investors on Nexa who aren&apos;t registered yet, ranked by fit. Invites arrive as a notification.</p>
        </div>
        <div className="flex rounded-xl border border-line bg-paper-2 p-1">
          {(["all", ...ROLES] as const).map((k) => (
            <button
              key={k}
              onClick={() => setRole(k)}
              className={`rounded-lg px-3 py-1 text-[12.5px] font-semibold transition ${role === k ? "bg-white text-ink shadow-[0_2px_8px_-4px_rgb(0_0_0/0.3)]" : "text-ink-2 hover:text-ink"}`}
            >
              {k === "all" ? "All" : cap(ROLE_PLURAL[k])}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="mt-4 rounded-lg bg-red-soft px-4 py-3 text-[13px] font-semibold text-red">{error}</p>}
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {shown.map((c) => (
          <div key={c.id} className="flex items-start gap-3 rounded-xl border border-line p-3.5">
            <span className={`grid size-10 shrink-0 place-items-center rounded-full text-[15px] font-bold ${ROLE_TONE[c.role]}`}>{c.name.charAt(0)}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold">
                {c.name} <span className="font-normal text-ink-3">· {COUNTRIES[c.country].flag} {c.org}</span>
              </p>
              <p className="text-[12px] text-ink-3">{focus(c)}</p>
              <p className="mt-1 text-[12px] text-teal-deep">{c.fit.reasons.join(" · ")}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <span className="font-mono text-[13px] font-semibold text-blue">{c.fit.score}</span>
              <button
                onClick={() => invite(c)}
                disabled={c.invited}
                className={`btn min-h-8 px-3 text-[12px] ${c.invited ? "bg-teal-soft text-teal-deep disabled:opacity-100" : "btn-blue"}`}
              >
                <Icon name={c.invited ? "check" : "mail"} size={13} /> {c.invited ? "Invited" : "Invite"}
              </button>
            </div>
          </div>
        ))}
        {list && !shown.length && <p className="col-span-full py-8 text-center text-[13px] text-ink-3">Nobody else on Nexa fits this event yet.</p>}
        {!list && !error && <div className="col-span-full h-20 animate-pulse rounded-xl bg-stone" />}
      </div>
    </section>
  );
}
