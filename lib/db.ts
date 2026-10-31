import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { Country, NexaEvent, Person, Registration, Role, Sector, Seniority, Skill, Stage } from "./types";

/**
 * SQLite through Node's built-in node:sqlite (no native install). One file, shared by
 * every browser. Delete it to reset the demo; it is re-created and re-seeded.
 *
 * Default: ~/.nexa/nexa.db, outside the project. SQLite touches its -wal/-shm files on
 * almost every request, and inside the project `next dev` sees those as changes,
 * rebuilds and reloads the page, which reads the database again: an endless loop.
 * On Fly.io NEXA_DB points at the volume (/data/nexa.db).
 */
// On Vercel only /tmp is writable: the demo database lives there and is re-seeded on a cold start.
const FILE = process.env.NEXA_DB || (process.env.VERCEL ? "/tmp/nexa.db" : path.join(homedir(), ".nexa", "nexa.db"));
const VERSION = 4;
/** Sample events open their guest list with this key, so the host view can be demoed. */
export const DEMO_KEY = "demo";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS events (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  host        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  format      TEXT NOT NULL CHECK (format IN ('in-person', 'online')),
  country     TEXT NOT NULL,
  city        TEXT NOT NULL DEFAULT '',
  venue       TEXT NOT NULL DEFAULT '',
  start       TEXT NOT NULL,
  "end"       TEXT NOT NULL,
  capacity    INTEGER,                 -- NULL = no limit
  audience    TEXT NOT NULL,           -- JSON Role[]
  sectors     TEXT NOT NULL,           -- JSON Sector[] or "any"
  host_key    TEXT NOT NULL,
  sample      INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);

-- One row per founder, investor or talent, reused across every event.
CREATE TABLE IF NOT EXISTS people (
  id          TEXT PRIMARY KEY,
  device_key  TEXT NOT NULL UNIQUE,    -- secret kept in the person's browser; no password
  role        TEXT NOT NULL CHECK (role IN ('startup', 'vc', 'talent')),  -- primary role
  roles       TEXT,                    -- JSON Role[]: every role they play, primary first
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  org         TEXT NOT NULL,           -- startup / fund / current company or school
  country     TEXT NOT NULL,
  note        TEXT NOT NULL DEFAULT '',
  sector      TEXT,                    -- startup
  stage       TEXT,                    -- startup
  hiring      TEXT,                    -- startup, JSON Skill[]
  sectors     TEXT,                    -- vc: sectors backed; talent: sectors wanted. JSON Sector[]
  stages      TEXT,                    -- vc, JSON Stage[]
  ticket      TEXT,                    -- vc
  skills      TEXT,                    -- talent, JSON Skill[]
  seniority   TEXT,                    -- talent
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS registrations (
  id         TEXT PRIMARY KEY,
  event_id   TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  person_id  TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  UNIQUE (event_id, person_id)
);

-- Host-tracked startup → investor intros. Only intros past "suggested" are stored.
CREATE TABLE IF NOT EXISTS intros (
  event_id   TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  startup_id TEXT NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  vc_id      TEXT NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  status     TEXT NOT NULL CHECK (status IN ('sent', 'meeting', 'deal')),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (startup_id, vc_id)
);

-- "Interested" clicks between guests of the same event. Both directions = a match.
CREATE TABLE IF NOT EXISTS interests (
  event_id   TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  from_id    TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  to_id      TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (event_id, from_id, to_id),
  CHECK (from_id <> to_id)
);

-- Organiser invites, so nobody is invited twice to the same event.
CREATE TABLE IF NOT EXISTS invites (
  event_id   TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  person_id  TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (event_id, person_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  person_id  TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('interest', 'match', 'invite')),
  text       TEXT NOT NULL,
  link       TEXT NOT NULL,
  read_at    TEXT,                     -- NULL = unread
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS registrations_event ON registrations(event_id);
CREATE INDEX IF NOT EXISTS registrations_person ON registrations(person_id);
CREATE INDEX IF NOT EXISTS intros_event ON intros(event_id);
CREATE INDEX IF NOT EXISTS interests_to ON interests(to_id);
CREATE INDEX IF NOT EXISTS notifications_person ON notifications(person_id, read_at);
`;

const g = globalThis as unknown as { nexaDb?: DatabaseSync };

export function db(): DatabaseSync {
  if (g.nexaDb) return g.nexaDb;
  mkdirSync(path.dirname(FILE), { recursive: true });
  const d = new DatabaseSync(FILE);
  d.exec("PRAGMA journal_mode = WAL;");
  const version = Number((d.prepare("PRAGMA user_version").get() as Row).user_version);
  if (version < 2 && columns(d, "registrations").includes("email")) migrateV1(d);
  else if (version === 2) migrateV2(d);
  d.exec(SCHEMA);
  // v4: a person can play several roles (say startup + talent).
  if (!columns(d, "people").includes("roles")) d.exec("ALTER TABLE people ADD COLUMN roles TEXT;");
  d.exec("UPDATE people SET roles = json_array(role) WHERE roles IS NULL;");
  d.exec(`PRAGMA user_version = ${VERSION}; PRAGMA foreign_keys = ON;`);
  seed(d);
  return (g.nexaDb = d);
}

export const newKey = () => randomBytes(16).toString("hex");
export const now = () => new Date().toISOString();

const columns = (d: DatabaseSync, table: string) =>
  (d.prepare(`PRAGMA table_info(${table})`).all() as Row[]).map((r) => r.name as string);

/**
 * v1 copied the guest's details into every registration. v2 keeps them once in `people`.
 * Registration ids are kept, so stored intros stay valid.
 */
function migrateV1(d: DatabaseSync) {
  d.exec("PRAGMA foreign_keys = OFF;");
  d.exec("BEGIN");
  try {
    d.exec(SCHEMA.split("CREATE TABLE IF NOT EXISTS registrations")[0]); // events + people
    const rows = d.prepare("SELECT * FROM registrations ORDER BY created_at").all() as Row[];
    const byEmail = new Map<string, string>();
    for (const r of rows) {
      const email = String(r.email);
      if (!byEmail.has(email)) {
        const id = randomUUID();
        byEmail.set(email, id);
        d.prepare(
          `INSERT INTO people (id, device_key, role, name, email, org, country, note, sector, stage, sectors, stages, ticket, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(id, newKey(), r.role, r.name, email, r.org, r.country, r.note, r.sector, r.stage, r.sectors, r.stages, r.ticket, r.created_at, r.created_at);
      }
    }
    d.exec(`CREATE TABLE registrations_v2 (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      UNIQUE (event_id, person_id)
    )`);
    for (const r of rows) {
      d.prepare("INSERT OR IGNORE INTO registrations_v2 (id, event_id, person_id, created_at) VALUES (?, ?, ?, ?)").run(r.id, r.event_id, byEmail.get(String(r.email))!, r.created_at);
    }
    d.exec("DROP TABLE registrations; ALTER TABLE registrations_v2 RENAME TO registrations;");
    d.exec("COMMIT");
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  } finally {
    d.exec("PRAGMA foreign_keys = ON;");
  }
}

/**
 * v3 adds talent. SQLite can't change a CHECK in place, so `people` is rebuilt with the same ids.
 * Order matters: build the new table, copy, drop the old one, then rename the new one in.
 * (Renaming the *old* table first would repoint every foreign key at it, and then it's dropped.)
 */
function migrateV2(d: DatabaseSync) {
  d.exec("PRAGMA foreign_keys = OFF;");
  d.exec("BEGIN");
  try {
    d.exec(SCHEMA.match(/CREATE TABLE IF NOT EXISTS people \([\s\S]*?\n\);/)![0].replace("IF NOT EXISTS people (", "people_v3 ("));
    d.exec(`INSERT INTO people_v3 (id, device_key, role, name, email, org, country, note, sector, stage, sectors, stages, ticket, created_at, updated_at)
            SELECT id, device_key, role, name, email, org, country, note, sector, stage, sectors, stages, ticket, created_at, updated_at FROM people;`);
    d.exec("DROP TABLE people; ALTER TABLE people_v3 RENAME TO people;");
    d.exec("COMMIT");
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  } finally {
    d.exec("PRAGMA foreign_keys = ON;");
  }
}

// ── rows ↔ objects ───────────────────────────────────────────
export type Row = Record<string, string | number | null>;

export const toEvent = (r: Row): NexaEvent => ({
  id: r.id as string,
  title: r.title as string,
  host: r.host as string,
  description: r.description as string,
  format: r.format as NexaEvent["format"],
  country: r.country as Country,
  city: r.city as string,
  venue: r.venue as string,
  start: r.start as string,
  end: r.end as string,
  capacity: r.capacity as number | null,
  audience: JSON.parse(r.audience as string),
  sectors: JSON.parse(r.sectors as string),
  createdAt: r.created_at as string,
  ...(r.sample ? { sample: true } : {}),
});

export const toPerson = (r: Row): Person => {
  const roles = json<Role[]>(r.roles, [r.role as Role]);
  return {
    id: r.id as string,
    role: r.role as Role,
    roles,
    name: r.name as string,
    email: r.email as string,
    org: r.org as string,
    country: r.country as Country,
    note: r.note as string,
    // Each role brings its own fields; a startup + talent person has both sets.
    ...(roles.includes("startup") ? { sector: r.sector as Sector, stage: r.stage as Stage, hiring: json<Skill[]>(r.hiring, []) } : {}),
    ...(roles.includes("vc") || roles.includes("talent") ? { sectors: json<Sector[]>(r.sectors, []) } : {}),
    ...(roles.includes("vc") ? { stages: json<Stage[]>(r.stages, []), ticket: (r.ticket as string) ?? "" } : {}),
    ...(roles.includes("talent") ? { skills: json<Skill[]>(r.skills, []), seniority: r.seniority as Seniority } : {}),
    createdAt: r.created_at as string,
  };
};
const json = <T>(v: string | number | null, fallback: T): T => (typeof v === "string" ? (JSON.parse(v) as T) : fallback);

/** Rows from REGISTRATION_SELECT: the person's profile plus the seat. */
export const toRegistration = (r: Row): Registration => ({ ...toPerson(r), id: r.reg_id as string, personId: r.id as string, eventId: r.event_id as string });
export const REGISTRATION_SELECT = "SELECT p.*, r.id AS reg_id, r.event_id FROM registrations r JOIN people p ON p.id = r.person_id";

export function insertEvent(d: DatabaseSync, e: NexaEvent, hostKey: string) {
  d.prepare(
    `INSERT INTO events (id, title, host, description, format, country, city, venue, start, "end", capacity, audience, sectors, host_key, sample, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    e.id, e.title, e.host, e.description, e.format, e.country, e.city, e.venue, e.start, e.end, e.capacity,
    JSON.stringify(e.audience), JSON.stringify(e.sectors), hostKey, e.sample ? 1 : 0, e.createdAt,
  );
}

/** The role-specific columns of a person, in PROFILE_COLUMNS order. */
export const PROFILE_COLUMNS = "role, roles, sector, stage, hiring, sectors, stages, ticket, skills, seniority";
export const profileValues = (p: Omit<Person, "id" | "createdAt">) => {
  const list = (v?: unknown[]) => (v ? JSON.stringify(v) : null);
  return [p.role, list(p.roles), p.sector ?? null, p.stage ?? null, list(p.hiring), list(p.sectors), list(p.stages), p.ticket ?? null, list(p.skills), p.seniority ?? null];
};

export function insertPerson(d: DatabaseSync, p: Person, deviceKey: string) {
  d.prepare(
    `INSERT INTO people (id, device_key, name, email, org, country, note, ${PROFILE_COLUMNS}, created_at, updated_at)
     VALUES (${Array(19).fill("?").join(", ")})`,
  ).run(p.id, deviceKey, p.name, p.email, p.org, p.country, p.note, ...profileValues(p), p.createdAt, p.createdAt);
}

export function notify(d: DatabaseSync, personId: string, type: "interest" | "match" | "invite", text: string, link: string) {
  d.prepare("INSERT INTO notifications (id, person_id, type, text, link, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(randomUUID(), personId, type, text, link, now());
}

// ── demo data ────────────────────────────────────────────────
/** Safe to run on every start: adds whatever demo rows are missing, never duplicates. */
function seed(d: DatabaseSync) {
  const at = "2026-10-31T00:00:00.000Z";
  const ev = (e: Omit<NexaEvent, "createdAt" | "sample">): NexaEvent => ({ ...e, createdAt: at, sample: true });
  const events: NexaEvent[] = [
    ev({
      id: "hack-day-kl-2026",
      title: "Hacktoberfest Hack Day Kuala Lumpur",
      host: "Kracked Devs × MyStartupCradle × TalentLabs",
      description:
        "A one-day build sprint with Major League Hacking and Hacktoberfest 2026. Solo hackers are placed in random teams of four on the day; mentors are on hand all day.\n\n" +
        "Check-in closes at 10:00 AM sharp, no walk-ins, registered participants 18+ only. Bring Google AI Studio, MLH, GitHub and Kracked Devs accounts you can already sign in to.\n\n" +
        "Sponsor: Odra Venture. Venue partner: DOJO Coworking Space. Registration and check-in: https://events.mlh.com/events/14817",
      format: "in-person",
      country: "MY",
      city: "Kuala Lumpur",
      venue: "DOJO Coworking Space, Level 1, Menara Amplewest, 6 Jalan P. Ramlee (3–5 min walk from Raja Chulan Monorail)",
      start: "2026-10-31T09:30",
      end: "2026-10-31T18:00",
      capacity: null,
      audience: ["startup", "vc", "talent"],
      sectors: "any",
    }),
    ev({
      id: "kl-investor-night",
      title: "ASEAN Investor Night: Kuala Lumpur",
      host: "Startup ASEAN × Cradle",
      description: "Ten-minute meetings between seed-stage founders and regional VCs. Every startup is pre-matched to at least two investors who back their sector and stage.",
      format: "in-person",
      country: "MY",
      city: "Kuala Lumpur",
      venue: "MaGIC, Cyberjaya",
      start: "2026-11-20T18:30",
      end: "2026-11-20T21:30",
      capacity: 80,
      audience: ["startup", "vc"],
      sectors: "any",
    }),
    ev({
      id: "agritech-pilot-day-jakarta",
      title: "Agri & Food Pilot Day",
      host: "Startup ASEAN Indonesia",
      description: "Agritech and foodtech startups pitch for cross-border proofs of concept with plantation groups and food processors.",
      format: "in-person",
      country: "ID",
      city: "Jakarta",
      venue: "GoWork Plaza Indonesia",
      start: "2026-12-04T09:00",
      end: "2026-12-04T13:00",
      capacity: 60,
      audience: ["startup", "vc"],
      sectors: ["agritech", "foodtech", "climate"],
    }),
    ev({
      id: "fintech-vc-office-hours",
      title: "Fintech VC Office Hours (online)",
      host: "Startup ASEAN Singapore",
      description: "Open office hours with fintech investors from Singapore, Vietnam and Thailand. Bring your deck and your hardest question.",
      format: "online",
      country: "SG",
      city: "Online",
      venue: "https://meet.example.com/nexa-fintech",
      start: "2026-11-12T15:00",
      end: "2026-11-12T17:00",
      capacity: null,
      audience: ["startup", "vc"],
      sectors: ["fintech", "saas", "ai"],
    }),
  ];

  type Seed = Omit<Person, "id" | "createdAt" | "email" | "note" | "roles"> & { note?: string; roles?: Role[] };
  const person = (p: Seed): Person => ({ note: "", roles: [p.role], ...p, id: randomUUID(), email: `${p.name.toLowerCase().replace(/\W+/g, ".")}@example.com`, createdAt: at });
  const P = {
    aisha: person({ role: "vc", name: "Aisha Rahman", org: "Gobi Partners", country: "MY", sectors: ["fintech", "agritech", "saas"], stages: ["seed", "series-a"], ticket: "US$ 250k–1M", note: "Seed fintech and agri-fintech with regional ambition." }),
    tran: person({ role: "vc", name: "Tran Minh", org: "Do Ventures", country: "VN", sectors: ["edtech", "healthtech", "ecommerce"], stages: ["pre-seed", "seed"], ticket: "US$ 100k–500k" }),
    kevin: person({ role: "vc", name: "Kevin Lim", org: "Antler", country: "SG", sectors: ["ai", "saas", "climate", "agritech"], stages: ["idea", "pre-seed"], ticket: "US$ 100k" }),
    dewi: person({ role: "vc", name: "Dewi Lestari", org: "East Ventures", country: "ID", sectors: ["agritech", "foodtech", "logistics"], stages: ["pre-seed", "seed"], ticket: "US$ 150k–750k" }),
    somchai: person({ role: "vc", name: "Somchai P.", org: "Beacon VC", country: "TH", sectors: ["fintech", "saas"], stages: ["seed", "series-a"], ticket: "US$ 500k–2M" }),
    maria: person({ role: "vc", name: "Maria Santos", org: "Kickstart Ventures", country: "PH", sectors: ["fintech", "edtech", "healthtech"], stages: ["seed"], ticket: "US$ 200k–1M" }),
    budi: person({ role: "startup", name: "Budi Santoso", org: "PadiGuard", country: "ID", sector: "agritech", stage: "pre-seed", hiring: ["engineering", "data-ai"], note: "Crop-disease detection for rice farmers." }),
    linh: person({ role: "startup", name: "Nguyen Linh", org: "Ví Xanh", country: "VN", sector: "fintech", stage: "seed", hiring: ["engineering", "growth"], note: "Micro-savings wallet for gig workers." }),
    siti: person({ role: "startup", name: "Siti Nur", org: "KlinikKu", country: "MY", sector: "healthtech", stage: "seed", hiring: ["design", "engineering"], note: "Appointment and records app for rural clinics." }),
    arif: person({ role: "startup", name: "Arif Hakim", org: "SawitSense", country: "MY", sector: "agritech", stage: "seed", hiring: ["data-ai", "operations"], note: "Drone yield mapping for oil-palm smallholders." }),
    pim: person({ role: "startup", name: "Pim Chaiyaporn", org: "FarmFresh TH", country: "TH", sector: "foodtech", stage: "pre-seed", hiring: ["growth"], note: "Farm-to-restaurant produce marketplace in Bangkok." }),
    jose: person({ role: "startup", name: "Jose Reyes", org: "PayLokal", country: "PH", sector: "fintech", stage: "pre-seed", hiring: ["engineering", "sales"], note: "QR payments for sari-sari stores." }),
    // Two roles: building her own startup and open to a founding-engineer job.
    farah: person({ role: "talent", roles: ["talent", "startup"], name: "Farah Aziz", org: "KedaiKira", country: "MY", skills: ["engineering"], seniority: "senior", sectors: ["fintech", "agritech"], sector: "fintech", stage: "idea", hiring: ["design"], note: "Full-stack (Next.js, Python). Building KedaiKira, bookkeeping for hawkers; open to a founding-engineer role." }),
    weijie: person({ role: "talent", name: "Tan Wei Jie", org: "NUS", country: "SG", skills: ["data-ai", "engineering"], seniority: "mid", sectors: ["ai", "healthtech", "agritech"], note: "ML engineer, computer vision. Looking for a seed-stage team." }),
    putri: person({ role: "talent", name: "Putri Ayu", org: "Freelance", country: "ID", skills: ["design", "product"], seniority: "mid", sectors: ["agritech", "edtech", "healthtech"], note: "Product designer, mobile-first. Part-time or contract." }),
    hafiz: person({ role: "talent", name: "Hafiz Rahman", org: "Universiti Malaya", country: "MY", skills: ["growth", "sales"], seniority: "junior", sectors: [], note: "Final-year student, ran growth for a campus marketplace. Any sector." }),
    maianh: person({ role: "talent", name: "Le Mai Anh", org: "Tiki", country: "VN", skills: ["product", "operations"], seniority: "senior", sectors: ["fintech", "ecommerce"], note: "PM, 6 years in e-commerce payments. Looking for my next 0→1." }),
    // The two sample accounts on /login act as these people (see SAMPLE_KEYS in lib/client.ts).
    // KrackedDevs: from lib/samples.ts KD_PROFILE (first sector, stage, one-liner).
    kd: person({ role: "startup", name: "KrackedDevs (sample)", org: "KrackedDevs", country: "MY", sector: "edtech", stage: "seed", hiring: ["engineering", "growth"], note: "Malaysia's builder ecosystem: a community, a school and a product lab, run by builders." }),
    // Cradle Fund: drafted by Gemma autofill from cradle.com.my (roles, org, country, stages, note).
    // The site lists no sectors, so the broad tech list and the CIP ticket are ours.
    cradle: person({
      role: "vc",
      name: "Cradle Fund (sample)",
      org: "Cradle Fund",
      country: "MY",
      sectors: ["ai", "fintech", "agritech", "healthtech", "edtech", "devtools", "saas", "climate"],
      stages: ["pre-seed", "seed"],
      ticket: "Grants up to RM 150k (CIP)",
      note: "A government-mandated agency that empowers early-stage technology startups through grants, investments, and ecosystem initiatives.",
    }),
  };
  /** Fixed device keys for the sample accounts, like DEMO_KEY for the demo host view. */
  const FIXED_KEYS: Partial<Record<keyof typeof P, string>> = { kd: "demo-kd", cradle: "demo-cradle" };

  const reg = (eventId: string, p: Person) =>
    d.prepare("INSERT OR IGNORE INTO registrations (id, event_id, person_id, created_at) VALUES (?, ?, ?, ?)").run(randomUUID(), eventId, p.id, at);

  d.exec("BEGIN");
  try {
    for (const e of events) {
      if (!d.prepare("SELECT 1 FROM events WHERE id = ?").get(e.id)) insertEvent(d, e, DEMO_KEY);
      // Demo events follow the seed (e.g. Hack Day opened to talent later); hosts' own events are never touched.
      else d.prepare("UPDATE events SET audience = ? WHERE id = ? AND sample = 1").run(JSON.stringify(e.audience), e.id);
    }
    // Demo people are matched by email, so a database made before them keeps its ids.
    for (const [name, p] of Object.entries(P) as [keyof typeof P, Person][]) {
      const fixed = FIXED_KEYS[name];
      const found = d.prepare("SELECT id FROM people WHERE email = ?").get(p.email) as Row | undefined;
      if (!found) {
        insertPerson(d, p, fixed ?? newKey());
        continue;
      }
      p.id = found.id as string;
      if (fixed) d.prepare("UPDATE people SET device_key = ? WHERE id = ?").run(fixed, p.id);
      if (p.hiring) d.prepare("UPDATE people SET hiring = ? WHERE id = ? AND hiring IS NULL").run(JSON.stringify(p.hiring), p.id);
    }
    // Arif, Pim, Jose and Maria aren't registered for the KL night: the organiser can find and invite them.
    for (const p of [P.aisha, P.tran, P.kevin, P.budi, P.linh, P.siti]) reg("kl-investor-night", p);
    for (const p of [P.dewi, P.kevin, P.budi, P.arif]) reg("agritech-pilot-day-jakarta", p);
    for (const p of [P.somchai, P.maria, P.linh]) reg("fintech-vc-office-hours", p);
    // Today's live demo: a mixed room of investors, startups and hackers.
    for (const p of [P.aisha, P.kevin, P.dewi, P.maria, P.budi, P.arif, P.siti, P.jose, P.pim, P.farah, P.weijie, P.putri, P.hafiz, P.cradle]) reg("hack-day-kl-2026", p);
    // KrackedDevs isn't registered anywhere: signing in as KD shows which events to pick.
    // Mai Anh isn't registered anywhere yet: organisers can find and invite her.
    // One outcome already logged, so the host funnel isn't empty in the demo.
    const regId = (eventId: string, p: Person) =>
      (d.prepare("SELECT id FROM registrations WHERE event_id = ? AND person_id = ?").get(eventId, p.id) as Row).id;
    d.prepare("INSERT OR IGNORE INTO intros (event_id, startup_id, vc_id, status, updated_at) VALUES (?, ?, ?, 'meeting', ?)").run(
      "kl-investor-night", regId("kl-investor-night", P.linh), regId("kl-investor-night", P.aisha), at,
    );
    d.exec("COMMIT");
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}
