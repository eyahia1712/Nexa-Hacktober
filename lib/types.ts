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

export type TrackStage = "saved" | "applied" | "meeting" | "deal";
export const TRACK_STAGES: TrackStage[] = ["saved", "applied", "meeting", "deal"];
