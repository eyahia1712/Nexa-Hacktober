import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { REGISTRATION_SELECT, db, insertEvent, notify, now, toEvent, toPerson, toRegistration, type Row } from "./db";
import { eventFit, pairFit, suggestIntros, type Intro } from "./eventMatch";
import { oneOf, personByKey, savePerson, someOf, str } from "./people";
import {
  COUNTRY_CODES,
  ROLE_PLURAL,
  ROLES,
  SECTORS,
  type Country,
  type EventSummary,
  type Fit,
  type IntroStatus,
  type NexaEvent,
  type Person,
  type Registration,
  type Role,
  type Sector,
} from "./types";

export { DEMO_KEY } from "./db";

export function summary(e: NexaEvent): EventSummary {
  const d = db();
  const c = d
    .prepare(
      // A person with two roles counts under both.
      "SELECT SUM(j.value = 'startup') AS startup, SUM(j.value = 'vc') AS vc, SUM(j.value = 'talent') AS talent FROM registrations r JOIN people p ON p.id = r.person_id, json_each(p.roles) j WHERE r.event_id = ?",
    )
    .get(e.id) as Row;
  // Mutual startup ↔ talent interest at this event: hiring conversations started.
  const t = d
    .prepare(
      `SELECT COUNT(*) AS n FROM interests a
       JOIN interests b ON b.event_id = a.event_id AND b.from_id = a.to_id AND b.to_id = a.from_id
       JOIN people pa ON pa.id = a.from_id JOIN people pb ON pb.id = a.to_id
       WHERE a.event_id = ? AND EXISTS (SELECT 1 FROM json_each(pa.roles) WHERE value = 'startup')
         AND EXISTS (SELECT 1 FROM json_each(pb.roles) WHERE value = 'talent')`,
    )
    .get(e.id) as Row;
  // Funnel counts: an intro that reached "deal" also counts as sent and as a meeting.
  const o = d
    .prepare("SELECT COUNT(*) AS sent, SUM(status IN ('meeting', 'deal')) AS meeting, SUM(status = 'deal') AS deal FROM intros WHERE event_id = ?")
    .get(e.id) as Row;
  return {
    ...e,
    counts: { startup: Number(c.startup ?? 0), vc: Number(c.vc ?? 0), talent: Number(c.talent ?? 0) },
    outcomes: { sent: Number(o.sent ?? 0), meeting: Number(o.meeting ?? 0), deal: Number(o.deal ?? 0), talent: Number(t.n ?? 0) },
  };
}

/** An online event's join link is for guests only. */
const publicView = (e: EventSummary): EventSummary => (e.format === "online" ? { ...e, venue: "" } : e);

const registrationsFor = (eventId: string) =>
  (db().prepare(`${REGISTRATION_SELECT} WHERE r.event_id = ? ORDER BY r.created_at`).all(eventId) as Row[]).map(toRegistration);

const isHost = (eventId: string, key?: string | null) =>
  !!key && !!db().prepare("SELECT 1 FROM events WHERE id = ? AND host_key = ?").get(eventId, key);

const findEvent = (id: string) => {
  const r = db().prepare("SELECT * FROM events WHERE id = ?").get(id) as Row | undefined;
  return r ? toEvent(r) : null;
};

// ── queries ──────────────────────────────────────────────────
export function listEvents(personKey?: string | null): EventSummary[] {
  const p = personByKey(personKey);
  const going = new Set(
    p ? (db().prepare("SELECT event_id FROM registrations WHERE person_id = ?").all(p.id) as Row[]).map((r) => r.event_id) : [],
  );
  return (db().prepare("SELECT * FROM events ORDER BY start").all() as Row[]).map((r) => ({ ...publicView(summary(toEvent(r))), going: going.has(r.id) }));
}

/** The guest list and intros only go to the host; `me` only to a signed-in person. */
export function getEvent(id: string, hostKey?: string | null, personKey?: string | null) {
  const e = findEvent(id);
  if (!e) return null;
  const event = summary(e);
  const p = personByKey(personKey);
  const registrations = registrationsFor(id);
  const seat = p ? registrations.find((r) => r.personId === p.id) : undefined;
  const me = p
    ? {
        person: p,
        registered: !!seat,
        // How many people on the other side of the room fit this person, without naming anyone.
        fit: registrations.filter((r) => r.personId !== p.id && pairFit(p, r)).length,
      }
    : null;
  const host = isHost(id, hostKey) ? { registrations, intros: introsFor(id, registrations) } : null;
  return { event: seat || host ? event : publicView(event), host, me };
}

/** Rule-based suggestions, with any status the host has saved laid on top. */
function introsFor(eventId: string, regs: Registration[]): Intro[] {
  const saved = new Map(
    (db().prepare("SELECT startup_id, vc_id, status FROM intros WHERE event_id = ?").all(eventId) as Row[]).map((r) => [
      `${r.startup_id}:${r.vc_id}`,
      r.status as IntroStatus,
    ]),
  );
  return suggestIntros(regs).map((i) => ({ ...i, status: saved.get(`${i.startup.id}:${i.vc.id}`) ?? "suggested" }));
}

export function createEvent(input: unknown): { event: EventSummary; hostKey: string } | { error: string } {
  const ev = cleanEvent(input);
  if ("error" in ev) return ev;
  const event: NexaEvent = { ...ev, id: slug(ev.title), createdAt: now() };
  const hostKey = randomBytes(12).toString("hex");
  insertEvent(db(), event, hostKey);
  return { event: summary(event), hostKey };
}

/**
 * Register for an event. A signed-in person registers in one click with their profile;
 * a newcomer's form creates their profile, and the device key comes back to keep.
 */
export function register(
  eventId: string,
  input: unknown,
  personKey: string | null,
): { personKey: string; venue: string } | { error: string; status: number } {
  const e = findEvent(eventId);
  if (!e) return { error: "Event not found.", status: 404 };
  const d = db();
  let p = personByKey(personKey);
  let key = personKey;
  if (!p) {
    const saved = savePerson(input, null);
    if ("error" in saved) return { error: saved.error, status: 400 };
    ({ person: p, key } = saved);
  }
  if (!p.roles.some((r) => e.audience.includes(r))) return { error: `This event isn't open to ${ROLE_PLURAL[p.role]}.`, status: 400 };
  if (d.prepare("SELECT 1 FROM registrations WHERE event_id = ? AND person_id = ?").get(eventId, p.id)) {
    return { personKey: key!, venue: e.venue };
  }
  const taken = Number((d.prepare("SELECT COUNT(*) AS n FROM registrations WHERE event_id = ?").get(eventId) as Row).n);
  if (e.capacity !== null && taken >= e.capacity) return { error: "Sorry, this event is full.", status: 409 };
  d.prepare("INSERT INTO registrations (id, event_id, person_id, created_at) VALUES (?, ?, ?, ?)").run(randomUUID(), eventId, p.id, now());
  return { personKey: key!, venue: e.venue };
}

export function setIntroStatus(eventId: string, key: string | null, input: unknown): { ok: true } | { error: string; status: number } {
  if (!isHost(eventId, key)) return { error: "Only the host can update intros.", status: 403 };
  const i = (input ?? {}) as Record<string, unknown>;
  const startupId = str(i.startupId, 64);
  const vcId = str(i.vcId, 64);
  const status = oneOf<IntroStatus>(i.status, ["suggested", "sent", "meeting", "deal"]);
  if (!startupId || !vcId || !status) return { error: "Bad intro update.", status: 400 };
  const d = db();
  const pair = d
    .prepare(
      `SELECT COUNT(*) AS n FROM registrations r JOIN people p ON p.id = r.person_id
       WHERE r.event_id = ? AND ((r.id = ? AND EXISTS (SELECT 1 FROM json_each(p.roles) WHERE value = 'startup'))
                              OR (r.id = ? AND EXISTS (SELECT 1 FROM json_each(p.roles) WHERE value = 'vc')))`,
    )
    .get(eventId, startupId, vcId) as Row;
  if (Number(pair.n) !== 2) return { error: "Those guests aren't a startup and investor at this event.", status: 400 };
  if (status === "suggested") {
    d.prepare("DELETE FROM intros WHERE startup_id = ? AND vc_id = ?").run(startupId, vcId);
  } else {
    d.prepare(
      `INSERT INTO intros (event_id, startup_id, vc_id, status, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (startup_id, vc_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`,
    ).run(eventId, startupId, vcId, status, now());
  }
  return { ok: true };
}

// ── organiser: find and invite participants ──────────────────
export type Candidate = Omit<Person, "email" | "createdAt"> & { fit: Fit; invited: boolean };

/** Everyone on Nexa who isn't registered yet, ranked by how well this event suits them. */
export function candidates(eventId: string, key: string | null): Candidate[] | { error: string; status: number } {
  if (!isHost(eventId, key)) return { error: "Only the host can search participants.", status: 403 };
  const e = findEvent(eventId)!;
  const d = db();
  const guests = registrationsFor(eventId);
  const invited = new Set((d.prepare("SELECT person_id FROM invites WHERE event_id = ?").all(eventId) as Row[]).map((r) => r.person_id));
  return (d.prepare("SELECT * FROM people WHERE id NOT IN (SELECT person_id FROM registrations WHERE event_id = ?)").all(eventId) as Row[])
    .map(toPerson)
    .map((p) => ({ p, fit: eventFit(p, e, guests) }))
    .filter((x): x is { p: Person; fit: Fit } => !!x.fit)
    .sort((a, b) => b.fit.score - a.fit.score)
    .map(({ p: { email: _e, createdAt: _c, ...p }, fit }) => ({ ...p, fit, invited: invited.has(p.id) }));
}

export function invite(eventId: string, key: string | null, input: unknown): { ok: true } | { error: string; status: number } {
  if (!isHost(eventId, key)) return { error: "Only the host can invite.", status: 403 };
  const personId = str((input as Record<string, unknown> | null)?.personId, 64);
  const d = db();
  if (!d.prepare("SELECT 1 FROM people WHERE id = ?").get(personId)) return { error: "Person not found.", status: 404 };
  const added = d.prepare("INSERT OR IGNORE INTO invites (event_id, person_id, created_at) VALUES (?, ?, ?)").run(eventId, personId, now()).changes > 0;
  if (added) {
    const e = findEvent(eventId)!;
    notify(d, personId, "invite", `${e.host} invited you to ${e.title}.`, `/events/${eventId}`);
  }
  return { ok: true };
}

// ── input cleaning ───────────────────────────────────────────
const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function cleanEvent(input: unknown): Omit<NexaEvent, "id" | "createdAt"> | { error: string } {
  const i = (input ?? {}) as Record<string, unknown>;
  const title = str(i.title, 120);
  const host = str(i.host, 120);
  const start = str(i.start, 16);
  const end = str(i.end, 16);
  const country = oneOf<Country>(i.country, COUNTRY_CODES);
  const audience = someOf<Role>(i.audience, ROLES);
  const cap = Number(i.capacity);
  if (!title) return { error: "Give the event a name." };
  if (!host) return { error: "Who is hosting?" };
  if (!country) return { error: "Pick a country." };
  if (!DATETIME.test(start) || !DATETIME.test(end)) return { error: "Add a start and end time." };
  if (end <= start) return { error: "The event must end after it starts." };
  if (!audience.length) return { error: "Open it to startups, investors or both." };
  const sectors = someOf<Sector>(i.sectors, SECTORS);
  return {
    title,
    host,
    description: str(i.description, 3000),
    format: i.format === "online" ? "online" : "in-person",
    country,
    city: str(i.city, 80),
    venue: str(i.venue, 300),
    start,
    end,
    capacity: Number.isInteger(cap) && cap > 0 ? cap : null,
    audience,
    sectors: sectors.length ? sectors : "any",
  };
}

function slug(title: string) {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "event";
  return `${base}-${randomBytes(3).toString("hex")}`;
}
