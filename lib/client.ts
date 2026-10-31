import { getSession, loadProfile } from "./store";
import { SECTOR_LABEL, type Sector } from "./types";

/** Browser helpers shared by the workspace and the events pages. */
export const store = {
  get<T>(k: string, fallback: T): T {
    try {
      const v = localStorage.getItem(k);
      return v ? (JSON.parse(v) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(k: string, v: unknown) {
    try {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
};

export async function post<T>(url: string, body: unknown, init: RequestInit = {}): Promise<T> {
  await ensurePerson();
  const res = await fetch(url, {
    method: "POST",
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Something went wrong");
  return json as T;
}

export async function getJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  await ensurePerson();
  const res = await fetch(url, { headers: { ...personHeaders(), ...headers } });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Something went wrong");
  return json as T;
}

export const sectorLabel = (s: string) => SECTOR_LABEL[s as Sector] ?? s.charAt(0).toUpperCase() + s.slice(1);

// ── who you are on the events side ───────────────────────────
/**
 * Your events profile (a "person" on the server) follows your Nexa login: one per account,
 * and one per company for guests, so signing in as KrackedDevs means acting as KrackedDevs.
 * With no login at all, the browser keeps one anonymous person (the old behaviour).
 * The device key is the only credential: whoever holds it is that person.
 */
const ANONYMOUS = "nexa.person";

/** Sample companies and accounts act as seeded demo people (see lib/db.ts). */
const SAMPLE_KEYS: Record<string, string> = { "sample-kd": "demo-kd", "sample-cradle": "demo-cradle" };

function identity() {
  const s = getSession();
  const p = s ? loadProfile(s.email) : null;
  return { session: s, profile: p, slot: s ? `nexa-person:${s.email}${p ? `:${p.id}` : ""}` : ANONYMOUS };
}

export function personKey(): string | null {
  const { session, profile, slot } = identity();
  return SAMPLE_KEYS[profile?.id ?? ""] ?? SAMPLE_KEYS[session?.email ?? ""] ?? store.get<string | null>(slot, null);
}

export const setPersonKey = (key: string | null) => store.set(identity().slot, key);

export const personHeaders = (): Record<string, string> => {
  const k = personKey();
  return k ? { "x-person-key": k } : {};
};

let ensuring: Promise<void> | null = null;

/**
 * A signed-in account with a company profile gets its events profile made from it on
 * first use, so it can find and join events straight away. Guests and accounts without
 * a company fill the registration form instead (it is prefilled where we can).
 */
export function ensurePerson(): Promise<void> {
  if (typeof window === "undefined" || personKey()) return Promise.resolve();
  const { session: s, profile: p, slot } = identity();
  if (!s || s.guest || !p) return Promise.resolve();
  ensuring ??= fetch("/api/me", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roles: ["startup"],
      name: s.name,
      email: s.email,
      org: p.name,
      country: p.country,
      sector: p.sectors[0],
      stage: p.stage,
      note: p.oneLiner,
    }),
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((j: { key?: string } | null) => {
      if (j?.key) store.set(slot, j.key);
    })
    .catch(() => {})
    .finally(() => {
      ensuring = null;
    });
  return ensuring;
}

/** The name to show for whoever is using the app right now. */
export function currentName(): string | null {
  const { session, profile } = identity();
  if (!session) return null;
  return session.guest ? (profile?.name ?? null) : session.name;
}
