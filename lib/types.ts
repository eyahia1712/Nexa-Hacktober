/** All 11 ASEAN member states. Timor-Leste joined as the 11th in October 2025. */
export const COUNTRIES = {
  MY: { name: "Malaysia", flag: "🇲🇾" },
  SG: { name: "Singapore", flag: "🇸🇬" },
  ID: { name: "Indonesia", flag: "🇮🇩" },
  TH: { name: "Thailand", flag: "🇹🇭" },
  VN: { name: "Vietnam", flag: "🇻🇳" },
  PH: { name: "Philippines", flag: "🇵🇭" },
  BN: { name: "Brunei", flag: "🇧🇳" },
  KH: { name: "Cambodia", flag: "🇰🇭" },
  LA: { name: "Laos", flag: "🇱🇦" },
  MM: { name: "Myanmar", flag: "🇲🇲" },
  TL: { name: "Timor-Leste", flag: "🇹🇱" },
} as const;

export type Country = keyof typeof COUNTRIES;
export const COUNTRY_CODES = Object.keys(COUNTRIES) as Country[];

export const STAGES = ["idea", "pre-seed", "seed", "series-a"] as const;
export type Stage = (typeof STAGES)[number];
export const STAGE_LABEL: Record<Stage, string> = {
  idea: "Idea",
  "pre-seed": "Pre-seed",
  seed: "Seed",
  "series-a": "Series A",
};

export const SECTORS = [
  "ai",
  "agritech",
  "fintech",
  "healthtech",
  "edtech",
  "devtools",
  "climate",
  "logistics",
  "ecommerce",
  "foodtech",
  "mobility",
  "saas",
] as const;
export type Sector = (typeof SECTORS)[number];
export const SECTOR_LABEL: Record<Sector, string> = {
  ai: "AI",
  agritech: "Agritech",
  fintech: "Fintech",
  healthtech: "Healthtech",
  edtech: "Edtech",
  devtools: "Dev tools",
  climate: "Climate",
  logistics: "Logistics",
  ecommerce: "E-commerce",
  foodtech: "Foodtech",
  mobility: "Mobility",
  saas: "SaaS",
};

export const NEEDS = ["funding", "mentorship", "pilot-partner", "market-entry", "talent", "cloud-credits"] as const;
export type Need = (typeof NEEDS)[number];
export const NEED_LABEL: Record<Need, string> = {
  funding: "Funding",
  mentorship: "Mentors",
  "pilot-partner": "Pilot partner",
  "market-entry": "Market entry",
  talent: "Talent",
  "cloud-credits": "Cloud credits",
};

export type OppType = "grant" | "investor" | "accelerator" | "partner" | "talent" | "programme";
export const OPP_TYPES: OppType[] = ["grant", "investor", "accelerator", "partner", "talent", "programme"];
export const TYPE_LABEL: Record<OppType, string> = {
  grant: "Grant",
  investor: "Investor",
  accelerator: "Accelerator",
  partner: "Corporate partner",
  talent: "Talent",
  programme: "Gov. programme",
};

export type Opportunity = {
  id: string;
  name: string;
  org: string;
  country: Country;
  type: OppType;
  stages: Stage[];
  sectors: Sector[] | "any";
  /** "ASEAN" = any founder in the region, otherwise only these home countries. */
  openTo: "ASEAN" | Country[];
  offers: Need[];
  amount: string;
  /** ISO date, or "rolling". */
  deadline: string;
  url: string;
  summary: string;
};

/** The company. Built once from a sample, an upload or a form. */
export type Profile = {
  id: string;
  name: string;
  oneLiner: string;
  about?: string;
  country: Country;
  sectors: Sector[];
  stage: Stage;
  teamSize: number;
  website?: string;
  /** Data URL or public path. */
  logo?: string;
  /** Wide picture for the top of the profile card. */
  banner?: string;
  /** Brand colour for accents on the card. */
  accent?: string;
  /** Up to four headline numbers, such as "3,744 builders". */
  highlights?: { value: string; label: string }[];
  source: "sample" | "upload" | "form";
};

/** What the company is looking for right now. */
export type Request = {
  needs: Need[];
  targetMarkets: Country[];
  ask?: string;
  notes?: string;
};

export type Reason = { tone: "good" | "warn" | "bad"; key: string; vars?: Record<string, string | number> };

export type Match = {
  opp: Opportunity;
  score: number;
  verdict: "strong" | "partial" | "no";
  reasons: Reason[];
  daysLeft: number | null;
};

export type PathStep = { title: string; detail: string; when: string };
export type Pathway = { steps: PathStep[]; documents: string[]; tip: string; mode: "gemma" | "rules" };

// ── Events ───────────────────────────────────────────────────
/** Who can register for an event. */
export const ROLES = ["startup", "vc", "talent"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABEL: Record<Role, string> = { startup: "Startup", vc: "VC / Investor", talent: "Talent" };
/** Plural, for counts and filters: "3 investors". */
export const ROLE_PLURAL: Record<Role, string> = { startup: "startups", vc: "investors", talent: "talent" };

/** What talent can do, and what startups hire for. */
export const SKILLS = ["engineering", "design", "product", "data-ai", "growth", "sales", "operations"] as const;
export type Skill = (typeof SKILLS)[number];
export const SKILL_LABEL: Record<Skill, string> = {
  engineering: "Engineering",
  design: "Design",
  product: "Product",
  "data-ai": "Data / AI",
  growth: "Growth",
  sales: "Sales",
  operations: "Operations",
};

export const SENIORITY = ["junior", "mid", "senior", "lead"] as const;
export type Seniority = (typeof SENIORITY)[number];
export const SENIORITY_LABEL: Record<Seniority, string> = { junior: "Junior", mid: "Mid-level", senior: "Senior", lead: "Lead / founder-level" };

export type NexaEvent = {
  id: string;
  title: string;
  host: string;
  description: string;
  format: "in-person" | "online";
  country: Country;
  city: string;
  /** Venue address, or the join link for online events. */
  venue: string;
  /** Local date-time, "YYYY-MM-DDTHH:mm". */
  start: string;
  end: string;
  /** null = no limit. */
  capacity: number | null;
  audience: Role[];
  sectors: Sector[] | "any";
  createdAt: string;
  /** Seeded demo event. */
  sample?: boolean;
};

/** What happened after the host introduced a startup to an investor. */
export type IntroStatus = "suggested" | "sent" | "meeting" | "deal";
export const INTRO_STAGES: { id: IntroStatus; label: string }[] = [
  { id: "suggested", label: "Suggested" },
  { id: "sent", label: "Intro sent" },
  { id: "meeting", label: "Meeting" },
  { id: "deal", label: "Deal" },
];

export type EventSummary = NexaEvent & {
  counts: Record<Role, number>;
  /** Intros the host has moved past "suggested": the event's measurable outcome. */
  outcomes: Record<Exclude<IntroStatus, "suggested">, number> & {
    /** Mutual startup ↔ talent interest: hiring conversations started at this event. */
    talent: number;
  };
  /** The signed-in person is registered. */
  going?: boolean;
};

/** One person across every event: a founder, an investor or talent. Identified by a device key, no password. */
export type Person = {
  id: string;
  /** Primary role: colour, avatar, labels. */
  role: Role;
  /** Every role this person plays, primary first, e.g. ["startup", "talent"]. */
  roles: Role[];
  name: string;
  email: string;
  org: string;
  country: Country;
  /** Startup: what they build. VC: what they want to meet. Talent: what they're looking for. */
  note: string;
  // Startup
  sector?: Sector;
  stage?: Stage;
  hiring?: Skill[];
  // VC: sectors and stages they back. Talent: sectors they want to work in.
  sectors?: Sector[];
  stages?: Stage[];
  ticket?: string;
  // Talent
  skills?: Skill[];
  seniority?: Seniority;
  createdAt: string;
};

/** A person's seat at one event. Profile fields come from the person. */
export type Registration = Person & { id: string; personId: string; eventId: string };

export type Fit = { score: number; reasons: string[] };

/** Another guest, as seen on the event dashboard. Email only shows once interest is mutual. */
export type Participant = Omit<Person, "email" | "createdAt"> & {
  fit: Fit;
  interest: { sent: boolean; received: boolean };
  email?: string;
};

export type EventRec = { event: EventSummary; fit: Fit };

export type NotificationType = "interest" | "match" | "invite";
export type Notice = {
  id: string;
  type: NotificationType;
  text: string;
  link: string;
  read: boolean;
  createdAt: string;
};

export type TrackStage = "saved" | "applied" | "meeting" | "deal";
export const TRACK_STAGES: TrackStage[] = ["saved", "applied", "meeting", "deal"];
