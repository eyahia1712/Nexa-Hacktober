"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "../Icon";
import { ensurePerson, getJson, personHeaders, personKey, post, setPersonKey } from "@/lib/client";
import { getSession } from "@/lib/store";
import { COUNTRIES, ROLE_LABEL, ROLE_PLURAL, ROLES, type EventRec, type EventSummary, type Notice, type Person } from "@/lib/types";
import { focus } from "./EventPage";
import { PersonForm } from "./PersonForm";
import { DateTile, EventsHeader, ROLE_TONE, RolePills, SHELL, fmtRange, isLive } from "./ui";

type MeData = { person: Person; going: EventSummary[]; recommended: EventRec[]; unread: number };

/** One person across every event: profile, events picked for them, their events, notifications. */
export function MePage() {
  const [data, setData] = useState<MeData | null>(null);
  const [notes, setNotes] = useState<Notice[]>([]);
  const [state, setState] = useState<"loading" | "new" | "ready">("loading");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState(false);

  const load = useCallback(async () => {
    await ensurePerson();
    if (!personKey()) return setState("new");
    getJson<MeData>("/api/me")
      .then((d) => {
        setData(d);
        setState("ready");
      })
      .catch(() => setState("new"));
    getJson<{ items: Notice[] }>("/api/me/notifications").then((r) => setNotes(r.items)).catch(() => {});
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  // Signed in (or a sample): the account decides who you are, so there is nothing to switch here.
  const [anonymous, setAnonymous] = useState(false);
  useEffect(() => setAnonymous(!getSession()), []);

  const save = async (v: unknown) => {
    setBusy(true);
    setError("");
    try {
      const r = await post<{ key: string }>("/api/me", v, { headers: personHeaders() });
      const isNew = !personKey();
      setPersonKey(r.key);
      if (isNew) return window.location.reload();
      setEditing(false);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-paper-2">
      <EventsHeader />
      <main className={`${SHELL} py-8`}>
        {state === "loading" && <div className="h-64 animate-pulse rounded-2xl bg-stone" />}

        {state === "new" && (
          <div className="mx-auto max-w-lg">
            <p className="micro text-ink-3">Your Nexa profile</p>
            <h1 className="mt-2 text-[clamp(1.8rem,3.6vw,2.4rem)] font-semibold tracking-[-0.03em]">Founder, investor or talent?</h1>
            <p className="mt-2 text-[14.5px] text-ink-2">One profile for every event. Startups find investors and talent, investors find companies, talent finds startups hiring. Organisers can invite you, and you register in one click.</p>
            <div className="box mt-6 p-5 sm:p-6">
              <PersonForm roles={[...ROLES]} busy={busy} error={error} submit={() => <>Create my profile <Icon name="arrow" size={16} /></>} onSubmit={save} />
            </div>
          </div>
        )}

        {state === "ready" && data && (
          <div className="grid items-start gap-5 lg:grid-cols-[360px_1fr]">
            <aside className="space-y-5 lg:sticky lg:top-20">
              <section className="box p-5">
                {editing ? (
                  <>
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[17px] font-semibold">Edit profile</p>
                      <button onClick={() => setEditing(false)} className="micro text-ink-3 hover:text-blue">Cancel</button>
                    </div>
                    <PersonForm initial={data.person} roles={[...ROLES]} busy={busy} error={error} submit={() => "Save"} onSubmit={save} />
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-3">
                      <span className={`grid size-14 shrink-0 place-items-center rounded-2xl text-[22px] font-extrabold ${ROLE_TONE[data.person.role]}`}>{data.person.name.charAt(0)}</span>
                      <div className="min-w-0">
                        <h1 className="text-[20px] font-semibold leading-tight">{data.person.name}</h1>
                        <p className="text-[13px] text-ink-3">{COUNTRIES[data.person.country].flag} {data.person.org}</p>
                        <span className="mt-1.5 block">
                          <RolePills roles={data.person.roles} />
                        </span>
                      </div>
                    </div>
                    <p className="mt-4 text-[13px] text-ink-2">{focus(data.person)}</p>
                    {data.person.note && <p className="mt-2 text-[13px] text-ink-2">{data.person.note}</p>}
                    <p className="mt-2 font-mono text-[12px] text-ink-3">{data.person.email}</p>
                    <button onClick={() => setEditing(true)} className="btn btn-line mt-4 min-h-9 w-full text-[13px]">
                      <Icon name="edit" size={15} /> Edit profile
                    </button>
                    {!anonymous ? null : leaving ? (
                      <div className="mt-3 rounded-xl bg-red-soft p-3 text-[12.5px] text-red">
                        This browser will forget you. There&apos;s no password, so you can&apos;t sign back in to this profile.
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => {
                              setPersonKey(null);
                              window.location.reload();
                            }}
                            className="btn min-h-8 bg-red px-3 text-[12px] text-white"
                          >
                            Forget me here
                          </button>
                          <button onClick={() => setLeaving(false)} className="btn min-h-8 px-3 text-[12px] text-ink-2">Keep</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setLeaving(true)} className="micro mt-3 w-full text-ink-3 hover:text-red">Switch person on this browser</button>
                    )}
                  </>
                )}
              </section>

              <section className="box p-5">
                <p className="micro text-ink-3">Notifications</p>
                <div className="mt-3 space-y-2">
                  {notes.slice(0, 8).map((n) => (
                    <Link key={n.id} href={n.link} className={`block rounded-xl border border-line p-3 text-[13px] leading-snug transition hover:border-blue ${n.read ? "text-ink-2" : "bg-blue-soft/40 text-ink"}`}>
                      {n.text}
                    </Link>
                  ))}
                  {!notes.length && <p className="text-[13px] text-ink-3">Nothing yet.</p>}
                </div>
              </section>
            </aside>

            <div className="space-y-5">
              <section className="box p-5 sm:p-6">
                <p className="micro text-ink-3">Your events</p>
                <div className="mt-3 space-y-2.5">
                  {data.going.map((e) => (
                    <div key={e.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3">
                      <DateTile start={e.start} />
                      <div className="min-w-0 flex-1">
                        <Link href={`/events/${e.id}`} className="text-[15px] font-semibold hover:text-blue">{e.title}</Link>
                        <p className="text-[12.5px] text-ink-3">{fmtRange(e)} · {e.audience.map((r) => `${e.counts[r]} ${ROLE_PLURAL[r]}`).join(" · ")}</p>
                      </div>
                      <Link href={`/events/${e.id}/live`} className={`btn min-h-9 px-3 text-[13px] ${isLive(e) ? "bg-red text-white hover:bg-red/90" : "btn-line"}`}>
                        {isLive(e) ? <><span className="blink size-1.5 rounded-full bg-white" /> Live dashboard</> : "Dashboard"}
                      </Link>
                    </div>
                  ))}
                  {!data.going.length && <p className="text-[13px] text-ink-3">No upcoming events yet. Pick one below.</p>}
                </div>
              </section>

              <section className="box p-5 sm:p-6">
                <p className="micro text-ink-3">Picked for you</p>
                <h2 className="mt-1 text-[22px] font-semibold tracking-tight">Events where the right people will be</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {data.recommended.map(({ event: e, fit }) => (
                    <Link key={e.id} href={`/events/${e.id}`} className="box box-lift flex flex-col p-4">
                      <div className="flex items-start gap-3">
                        <DateTile start={e.start} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-semibold leading-snug">{e.title}</p>
                          <p className="mt-0.5 text-[12px] text-ink-3">{e.format === "online" ? "Online" : `${COUNTRIES[e.country].flag} ${e.city}`} · {e.host}</p>
                        </div>
                        <span className="rounded-full bg-teal-soft px-2 py-0.5 font-mono text-[12px] font-semibold text-teal-deep">{fit.score}</span>
                      </div>
                      <ul className="mt-3 space-y-1">
                        {fit.reasons.map((r) => (
                          <li key={r} className="flex items-start gap-1.5 text-[12.5px] text-ink-2">
                            <Icon name="check" size={13} stroke={2.6} className="mt-0.5 text-teal" /> {r}
                          </li>
                        ))}
                      </ul>
                    </Link>
                  ))}
                  {!data.recommended.length && <p className="col-span-full text-[13px] text-ink-3">No upcoming events fit your profile yet.</p>}
                </div>
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
