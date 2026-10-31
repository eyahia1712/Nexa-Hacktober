import "server-only";
import { daysLeft } from "./match";
import {
  COUNTRIES,
  COUNTRY_CODES,
  NEEDS,
  NEED_LABEL,
  SECTORS,
  STAGES,
  type Country,
  type Match,
  type Need,
  type Pathway,
  type Profile,
  type Request,
  type Sector,
  type Stage,
} from "./types";

export const MODEL = process.env.GEMMA_MODEL || "gemma-4-26b-a4b-it";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export type FilePart = { mime: string; data: string };

export function hasKey() {
  const k = process.env.GEMINI_API_KEY;
  return !!k && !k.includes("paste-your-key");
}

/** Calls Gemma 4 through the Gemini API and returns the answer text (thinking removed). */
export async function gemma(prompt: string, files: FilePart[] = []): Promise<string> {
  const parts = [
    ...files.map((f) => ({ inline_data: { mime_type: f.mime, data: f.data } })),
    { text: prompt },
  ];
  // Minimal thinking keeps answers fast enough for a live demo (about 3× quicker).
  const call = (fast: boolean) =>
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
          ...(fast ? { thinkingConfig: { thinkingLevel: "minimal" } } : {}),
        },
      }),
    });
  let res = await call(true);
  if (res.status === 400) res = await call(false);
  // Google sometimes answers 500/503 under load: one quick retry usually works.
  if (res.status >= 500) {
    await new Promise((r) => setTimeout(r, 1200));
    res = await call(true);
  }
  if (!res.ok) throw new Error(`Gemma ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const out = (json.candidates?.[0]?.content?.parts ?? [])
    .filter((p: { thought?: boolean }) => !p.thought)
    .map((p: { text?: string }) => p.text ?? "")
    .join("")
    .trim();
  if (!out) throw new Error("Gemma returned an empty answer");
  return out;
}

/** Pulls the first JSON object out of a model answer, tolerating code fences. */
export function parseJson<T>(text: string): T {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("No JSON in answer");
  return JSON.parse(text.slice(start, end + 1)) as T;
}


const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(String(v).toLowerCase() as T) ? (String(v).toLowerCase() as T) : fallback;
const pickMany = <T extends string>(v: unknown, allowed: readonly T[]): T[] =>
  Array.isArray(v) ? [...new Set(v.map((x) => String(x).toLowerCase()).filter((x): x is T => allowed.includes(x as T)))] : [];
const pickCountry = (v: unknown, fallback: Country): Country =>
  COUNTRY_CODES.includes(String(v).toUpperCase() as Country) ? (String(v).toUpperCase() as Country) : fallback;
const str = (v: unknown, max: number) => (v === null || v === undefined || v === "null" ? undefined : String(v).trim().slice(0, max) || undefined);

// ── Company profile ─────────────────────────────────────────

export const PROFILE_PROMPT = `You are reading a company's pitch deck, company profile or description for Nexa, a gateway to startup opportunities across the 11 ASEAN countries.
Extract the company profile. Reply with ONE JSON object only, no prose:
{
  "name": string,
  "oneLiner": string (max 18 words, what they do),
  "about": string (max 45 words),
  "country": one of ${JSON.stringify(COUNTRY_CODES)} (where the company is based; TL is Timor-Leste),
  "sectors": 1 to 3 of ${JSON.stringify(SECTORS)},
  "stage": one of ${JSON.stringify(STAGES)},
  "teamSize": number,
  "website": string or null,
  "highlights": up to 3 objects {"value": short number like "1,200", "label": 1-3 words like "Farmers"} taken from the document, or [],
  "needs": array of ${JSON.stringify(NEEDS)} if the document says what they are looking for, else [],
  "targetMarkets": country codes they want to expand into, else [],
  "ask": string or null (e.g. "US$150k pre-seed")
}
If something is not stated, make the most reasonable guess from context.`;

export function cleanProfile(raw: Record<string, unknown>): Profile {
  const sectors = pickMany<Sector>(raw.sectors, SECTORS).slice(0, 3);
  const highlights = Array.isArray(raw.highlights)
    ? raw.highlights
        .map((h: { value?: unknown; label?: unknown }) => ({ value: str(h?.value, 12) ?? "", label: str(h?.label, 24) ?? "" }))
        .filter((h) => h.value && h.label)
        .slice(0, 3)
    : [];
  const website = str(raw.website, 80);
  return {
    id: `me-${Date.now()}`,
    name: str(raw.name, 60) ?? "Your company",
    oneLiner: str(raw.oneLiner, 180) ?? "",
    about: str(raw.about, 400),
    country: pickCountry(raw.country, "MY"),
    sectors: sectors.length ? sectors : ["saas"],
    stage: pick<Stage>(raw.stage, STAGES, "pre-seed"),
    teamSize: Math.max(1, Math.min(5000, Math.round(Number(raw.teamSize)) || 2)),
    website: website ? (/^https?:\/\//.test(website) ? website : `https://${website}`) : undefined,
    highlights: highlights.length ? highlights : undefined,
    source: "upload",
  };
}

// ── What they are looking for ───────────────────────────────

export const REQUEST_PROMPT = `You are reading a startup's pitch, deck or note to find out what they are looking for right now.
Reply with ONE JSON object only, no prose:
{
  "needs": 1 to 4 of ${JSON.stringify(NEEDS)},
  "targetMarkets": ASEAN country codes from ${JSON.stringify(COUNTRY_CODES)} they want to enter or work in (not only their home country), or [],
  "ask": string or null (short, e.g. "US$500k seed" or "a pilot with a bank"),
  "notes": string (max 30 words, the most useful context for matching)
}`;

export function cleanRequest(raw: Record<string, unknown>, home?: Country): Request {
  const needs = pickMany<Need>(raw.needs, NEEDS);
  return {
    needs: needs.length ? needs : ["funding"],
    targetMarkets: (Array.isArray(raw.targetMarkets) ? raw.targetMarkets : [])
      .map((c) => String(c).toUpperCase())
      .filter((c, i, a): c is Country => COUNTRY_CODES.includes(c as Country) && c !== home && a.indexOf(c) === i),
    ask: str(raw.ask, 80),
    notes: str(raw.notes, 300),
  };
}

// ── Pathway ─────────────────────────────────────────────────

export function pathwayPrompt(p: Profile, r: Request, m: Match, language: string, today: string) {
  return `You are Nexa, a practical guide for startups applying to opportunities across ASEAN. Today is ${today}.
Plan this company's route to ONE opportunity. Write everything in ${language}.
Company: ${JSON.stringify({ name: p.name, oneLiner: p.oneLiner, country: COUNTRIES[p.country].name, sectors: p.sectors, stage: p.stage, teamSize: p.teamSize, highlights: p.highlights })}
Looking for: ${JSON.stringify({ needs: r.needs.map((n) => NEED_LABEL[n]), targetMarkets: r.targetMarkets.map((c) => COUNTRIES[c].name), ask: r.ask, notes: r.notes })}
Opportunity: ${JSON.stringify({ name: m.opp.name, org: m.opp.org, country: COUNTRIES[m.opp.country].name, type: m.opp.type, offers: m.opp.offers, amount: m.opp.amount, deadline: m.opp.deadline, summary: m.opp.summary })}
Fit score (decided by fixed rules): ${m.score}/100.
Reply with ONE JSON object only:
{
  "steps": 4 or 5 objects {"title": max 7 words, "detail": max 26 words, specific to THIS company and opportunity, "when": short timing like "This week" or "Week 2" that fits before the deadline},
  "documents": 3 to 5 short items to prepare,
  "tip": one sentence, the single most useful insider tip
}
Never invent amounts, dates or contacts that are not given above.`;
}

export function cleanPathway(raw: Record<string, unknown>): Pathway {
  const steps = (Array.isArray(raw.steps) ? raw.steps : [])
    .map((s: { title?: unknown; detail?: unknown; when?: unknown }) => ({ title: str(s?.title, 80) ?? "", detail: str(s?.detail, 260) ?? "", when: str(s?.when, 30) ?? "" }))
    .filter((s) => s.title)
    .slice(0, 6);
  if (!steps.length) throw new Error("No steps");
  return {
    steps,
    documents: (Array.isArray(raw.documents) ? raw.documents : []).map((d) => str(d, 90)).filter((d): d is string => !!d).slice(0, 6),
    tip: str(raw.tip, 240) ?? "",
    mode: "gemma",
  };
}

/** The same pathway from plain rules, used when there is no API key or Gemma is busy. */
export function rulesPathway(p: Profile, m: Match): Pathway {
  const left = daysLeft(m.opp.deadline);
  const by = left === null ? "Anytime (rolling)" : `Before ${m.opp.deadline}`;
  return {
    steps: [
      { title: "Check the brief and rules", detail: `Read ${m.opp.org}'s page and confirm ${p.name} meets every condition for ${m.opp.name}.`, when: "This week" },
      { title: "Tailor your pitch", detail: `Lead with how ${p.name} uses what ${m.opp.org} offers: ${m.opp.offers.map((o) => NEED_LABEL[o].toLowerCase()).join(", ")}.`, when: "Week 1" },
      { title: "Get a warm intro", detail: `Ask your network or Startup ASEAN for an intro to the ${m.opp.org} team before you apply.`, when: "Week 1–2" },
      { title: "Submit the application", detail: `Send the application with your deck and numbers. Track it in Nexa.`, when: by },
    ],
    documents: ["Pitch deck (10–12 slides)", "Company registration", "Traction numbers", "Team bios"],
    tip: `${m.opp.name} offers ${m.opp.amount}. Say exactly how you will use it.`,
    mode: "rules",
  };
}

export const LANGUAGE_NAME: Record<string, string> = {
  en: "English",
  ms: "Bahasa Melayu",
  id: "Bahasa Indonesia",
  zh: "Simplified Chinese",
  ta: "Tamil",
  th: "Thai",
  vi: "Vietnamese",
  fil: "Filipino",
  km: "Khmer",
  lo: "Lao",
  my: "Burmese",
  tet: "Tetum",
};

// ── Sample answer when no API key is set ────────────────────
export const SAMPLE_PROFILE: Profile = {
  id: "sample-padiguard",
  name: "PadiGuard",
  oneLiner: "Phone-photo AI that warns rice farmers about pest outbreaks before they spread.",
  about: "Indonesian agritech. Farmers snap a photo; the model spots pests early and sends a warning to the whole co-op.",
  country: "ID",
  sectors: ["agritech", "ai"],
  stage: "pre-seed",
  teamSize: 2,
  highlights: [
    { value: "1,200", label: "Farmers" },
    { value: "3", label: "Co-ops" },
  ],
  source: "upload",
};
