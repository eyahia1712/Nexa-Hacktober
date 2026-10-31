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
  "agritech",
  "fintech",
  "healthtech",
  "edtech",
  "climate",
  "logistics",
  "ecommerce",
  "ai",
  "foodtech",
  "mobility",
  "saas",
] as const;
export type Sector = (typeof SECTORS)[number];

export const NEEDS = [
  "funding",
  "mentorship",
  "pilot-partner",
  "market-entry",
  "talent",
  "cloud-credits",
] as const;
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
  /** Added by the user from a poster or link. */
  imported?: boolean;
};

export type Profile = {
  name: string;
  oneLiner: string;
  country: Country;
  sector: Sector;
  stage: Stage;
  teamSize: number;
  needs: Need[];
  targetMarkets: Country[];
  ask?: string;
  traction?: string;
};

export type Reason = { tone: "good" | "warn" | "bad"; text: string };

export type Match = {
  opp: Opportunity;
  score: number;
  verdict: "strong" | "partial" | "no";
  reasons: Reason[];
  daysLeft: number | null;
};

export type TrackStage = "saved" | "applied" | "meeting" | "deal";
export const TRACK_STAGES: { id: TrackStage; label: string }[] = [
  { id: "saved", label: "Saved" },
  { id: "applied", label: "Applied" },
  { id: "meeting", label: "Meeting" },
  { id: "deal", label: "Deal" },
];
