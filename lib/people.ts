import "server-only";
import { randomUUID } from "node:crypto";
import { PROFILE_COLUMNS, REGISTRATION_SELECT, db, insertPerson, newKey, notify, now, profileValues, toEvent, toPerson, toRegistration, type Row } from "./db";
import { eventFit, hasRole, pairFit } from "./eventMatch";
import { summary } from "./events";
import {
  COUNTRY_CODES,
  ROLES,
  SECTORS,
  SENIORITY,
  SKILLS,
  STAGES,
  type Country,
  type EventRec,
  type EventSummary,
  type Notice,
  type NotificationType,
  type Participant,
  type Person,
  type Role,
  type Sector,
  type Seniority,
  type Skill,
  type Stage,
} from "./types";

/** Who is calling: the person whose device key is in x-person-key. */
export function personByKey(key?: string | null): Person | null {
  if (!key) return null;
  const r = db().prepare("SELECT * FROM people WHERE device_key = ?").get(key) as Row | undefined;
  return r ? toPerson(r) : null;
}

/** Create a profile, or update the caller's own (roles can be added or dropped). */
export function savePerson(input: unknown, key?: string | null): { person: Person; key: string } | { error: string } {
  const existing = personByKey(key);
  const p = cleanPerson(input);
  if ("error" in p) return p;
  const d = db();
  if (existing) {
    const set = PROFILE_COLUMNS.split(", ").map((c) => `${c} = ?`).join(", ");
    d.prepare(`UPDATE people SET name = ?, email = ?, org = ?, country = ?, note = ?, ${set}, updated_at = ? WHERE id = ?`).run(
      p.name, p.email, p.org, p.country, p.note, ...profileValues(p), now(), existing.id,
    );
    return { person: { ...p, id: existing.id, createdAt: existing.createdAt }, key: key! };
  }
  const person: Person = { ...p, id: randomUUID(), createdAt: now() };
  const k = newKey();
  insertPerson(d, person, k);
  return { person, key: k };
}

/** The "Me" page: profile, my events, events picked for me, unread count. */
export function me(key: string | null) {
  const p = personByKey(key);
  if (!p) return null;
  const d = db();
  const going = new Set((d.prepare("SELECT event_id FROM registrations WHERE person_id = ?").all(p.id) as Row[]).map((r) => r.event_id as string));
  const today = new Date().toISOString().slice(0, 10);
  const events = (d.prepare(`SELECT * FROM events WHERE "end" >= ? ORDER BY start`).all(today) as Row[]).map(toEvent);
  const mine: EventSummary[] = [];
  const recs: EventRec[] = [];
  for (const e of events) {
    const s = { ...summary(e), going: going.has(e.id) };
    if (s.going) {
      mine.push(s);
      continue;
    }
    const guests = (d.prepare(`${REGISTRATION_SELECT} WHERE r.event_id = ?`).all(e.id) as Row[]).map(toRegistration);
    const fit = eventFit(p, e, guests);
    if (fit) recs.push({ event: s, fit });
  }
  recs.sort((a, b) => b.fit.score - a.fit.score);
  return { person: p, going: mine, recommended: recs.slice(0, 6), unread: unreadCount(p.id) };
}

// ── event dashboard ──────────────────────────────────────────
const seatOf = (eventId: string, personId: string) =>
  db().prepare("SELECT id FROM registrations WHERE event_id = ? AND person_id = ?").get(eventId, personId) as Row | undefined;

/** Everyone else at the event, ranked by fit to the caller. Guests only. */
export function participants(eventId: string, key: string | null): { me: Person; participants: Participant[] } | { error: string; status: number } {
  const p = personByKey(key);
  if (!p || !seatOf(eventId, p.id)) return { error: "Register for this event to see who's coming.", status: 403 };
  const d = db();
  const sent = new Set((d.prepare("SELECT to_id FROM interests WHERE event_id = ? AND from_id = ?").all(eventId, p.id) as Row[]).map((r) => r.to_id));
  const received = new Set((d.prepare("SELECT from_id FROM interests WHERE event_id = ? AND to_id = ?").all(eventId, p.id) as Row[]).map((r) => r.from_id));
  const list = (d.prepare(`${REGISTRATION_SELECT} WHERE r.event_id = ? AND p.id <> ?`).all(eventId, p.id) as Row[])
    .map(toRegistration)
    .map((g): Participant => {
      const mutual = sent.has(g.personId) && received.has(g.personId);
      return {
        id: g.personId,
        role: g.role,
        roles: g.roles,
        name: g.name,
        org: g.org,
        country: g.country,
        note: g.note,
        sector: g.sector,
        stage: g.stage,
        hiring: g.hiring,
        sectors: g.sectors,
        stages: g.stages,
        ticket: g.ticket,
        skills: g.skills,
        seniority: g.seniority,
        fit: pairFit(p, g) ?? { score: 0, reasons: [] },
        interest: { sent: sent.has(g.personId), received: received.has(g.personId) },
        // Contact details only once both sides said yes.
        ...(mutual ? { email: g.email } : {}),
      };
    })
    .sort((a, b) => Number(b.interest.received) - Number(a.interest.received) || b.fit.score - a.fit.score);
  return { me: p, participants: list };
}

/** "Interested" on another guest. They get notified; if they already said yes, it's a match. */
export function sendInterest(eventId: string, key: string | null, input: unknown): { mutual: boolean } | { error: string; status: number } {
  const p = personByKey(key);
  if (!p || !seatOf(eventId, p.id)) return { error: "Register for this event first.", status: 403 };
  const toId = str((input as Record<string, unknown> | null)?.toId, 64);
  const d = db();
  const target = d.prepare("SELECT * FROM people WHERE id = ?").get(toId) as Row | undefined;
  if (!target || toId === p.id || !seatOf(eventId, toId)) return { error: "That person isn't at this event.", status: 400 };
  const them = toPerson(target);
  const event = toEvent(d.prepare("SELECT * FROM events WHERE id = ?").get(eventId) as Row);
  const link = `/events/${eventId}/live`;

  const added = d.prepare("INSERT OR IGNORE INTO interests (event_id, from_id, to_id, created_at) VALUES (?, ?, ?, ?)").run(eventId, p.id, toId, now()).changes > 0;
  const mutual = !!d.prepare("SELECT 1 FROM interests WHERE event_id = ? AND from_id = ? AND to_id = ?").get(eventId, toId, p.id);
  if (!added) return { mutual };

  if (mutual) {
    notify(d, them.id, "match", `It's a match: you and ${p.name} (${p.org}) are both interested. Contact details are unlocked.`, link);
    notify(d, p.id, "match", `It's a match: you and ${them.name} (${them.org}) are both interested. Contact details are unlocked.`, link);
    // A founder–investor match is an intro the host can follow to a deal.
    const pair = hasRole(p, "startup") && hasRole(them, "vc") ? [p, them] : hasRole(them, "startup") && hasRole(p, "vc") ? [them, p] : null;
    if (pair) {
      const [s, v] = pair;
      d.prepare("INSERT OR IGNORE INTO intros (event_id, startup_id, vc_id, status, updated_at) VALUES (?, ?, ?, 'sent', ?)").run(
        eventId, seatOf(eventId, s.id)!.id, seatOf(eventId, v.id)!.id, now(),
      );
    }
  } else {
    notify(d, them.id, "interest", `${p.name} (${p.org}) is interested in meeting you at ${event.title}.`, link);
  }
  return { mutual };
}

// ── notifications ────────────────────────────────────────────
const unreadCount = (personId: string) =>
  Number((db().prepare("SELECT COUNT(*) AS n FROM notifications WHERE person_id = ? AND read_at IS NULL").get(personId) as Row).n);

export function notifications(key: string | null): { items: Notice[]; unread: number } | null {
  const p = personByKey(key);
  if (!p) return null;
  const items = (db().prepare("SELECT * FROM notifications WHERE person_id = ? ORDER BY created_at DESC LIMIT 50").all(p.id) as Row[]).map((r) => ({
    id: r.id as string,
    type: r.type as NotificationType,
    text: r.text as string,
    link: r.link as string,
    read: r.read_at !== null,
    createdAt: r.created_at as string,
  }));
  return { items, unread: unreadCount(p.id) };
}

export function markAllRead(key: string | null) {
  const p = personByKey(key);
  if (p) db().prepare("UPDATE notifications SET read_at = ? WHERE person_id = ? AND read_at IS NULL").run(now(), p.id);
}

// ── input cleaning ───────────────────────────────────────────
export const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
export const oneOf = <T extends string>(v: unknown, list: readonly T[]): T | undefined => (list.includes(v as T) ? (v as T) : undefined);
export const someOf = <T extends string>(v: unknown, list: readonly T[]): T[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is T => list.includes(x)))] : [];

/** A profile with one or more roles. Each role's fields are checked; the first role is the primary one. */
export function cleanPerson(input: unknown): Omit<Person, "id" | "createdAt"> | { error: string } {
  const i = (input ?? {}) as Record<string, unknown>;
  const picked = someOf<Role>(i.roles, ROLES);
  const roles = picked.length ? picked : [oneOf<Role>(i.role, ROLES)].filter((r): r is Role => !!r);
  const role = roles[0];
  const name = str(i.name, 100);
  const email = str(i.email, 160).toLowerCase();
  const org = str(i.org, 120);
  const country = oneOf<Country>(i.country, COUNTRY_CODES);
  if (!role) return { error: "Are you a startup, an investor or talent?" };
  if (!name) return { error: "Add your name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Add a valid email." };
  if (!org) return { error: role === "vc" ? "Add your fund or firm." : role === "talent" ? "Add where you work or study (or Freelance)." : "Add your startup's name." };
  if (!country) return { error: "Pick your country." };
  let p: Omit<Person, "id" | "createdAt"> = { role, roles, name, email, org, country, note: str(i.note, 500) };
  if (roles.includes("startup")) {
    const sector = oneOf<Sector>(i.sector, SECTORS);
    const stage = oneOf<Stage>(i.stage, STAGES);
    if (!sector || !stage) return { error: "Pick your startup's sector and stage." };
    p = { ...p, sector, stage, hiring: someOf<Skill>(i.hiring, SKILLS) };
  }
  // Investors: sectors they back. Talent: sectors they want to work in. One list serves both.
  if (roles.includes("vc") || roles.includes("talent")) p = { ...p, sectors: someOf<Sector>(i.sectors, SECTORS) };
  if (roles.includes("vc")) {
    const stages = someOf<Stage>(i.stages, STAGES);
    if (!p.sectors?.length || !stages.length) return { error: "Pick at least one sector and stage you invest in." };
    p = { ...p, stages, ticket: str(i.ticket, 60) };
  }
  if (roles.includes("talent")) {
    const skills = someOf<Skill>(i.skills, SKILLS);
    const seniority = oneOf<Seniority>(i.seniority, SENIORITY);
    if (!skills.length || !seniority) return { error: "Pick your skills and level." };
    p = { ...p, skills, seniority };
  }
  return p;
}
