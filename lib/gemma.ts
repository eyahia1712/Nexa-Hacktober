import "server-only";
import {
  COUNTRY_CODES,
  NEEDS,
  SECTORS,
  STAGES,
  type Country,
  type Need,
  type Opportunity,
  type OppType,
  type Profile,
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
  Array.isArray(v)
    ? [...new Set(v.map((x) => String(x).toLowerCase()).filter((x): x is T => allowed.includes(x as T)))]
    : [];
const pickCountry = (v: unknown, fallback: Country): Country =>
  COUNTRY_CODES.includes(String(v).toUpperCase() as Country) ? (String(v).toUpperCase() as Country) : fallback;

/** Makes sure every field the matcher relies on is valid, whatever the model returned. */
export function cleanProfile(raw: Record<string, unknown>): Profile {
  const country = pickCountry(raw.country, "MY");
  const needs = pickMany<Need>(raw.needs, NEEDS);
  return {
    name: String(raw.name || "Your startup").slice(0, 60),
    oneLiner: String(raw.oneLiner || "").slice(0, 200),
    country,
    sector: pick<Sector>(raw.sector, SECTORS, "saas"),
    stage: pick<Stage>(raw.stage, STAGES, "pre-seed"),
    teamSize: Math.max(1, Math.min(500, Number(raw.teamSize) || 2)),
    needs: needs.length ? needs : ["funding"],
    targetMarkets: (Array.isArray(raw.targetMarkets) ? raw.targetMarkets : [])
      .map((c) => pickCountry(c, country))
      .filter((c, i, a) => c !== country && a.indexOf(c) === i),
    ask: raw.ask ? String(raw.ask).slice(0, 80) : undefined,
    traction: raw.traction ? String(raw.traction).slice(0, 160) : undefined,
  };
}

export const PROFILE_PROMPT = `You are reading a startup's pitch deck or description for an ASEAN startup gateway.
Extract the startup profile. Reply with ONE JSON object only, no prose:
{
  "name": string,
  "oneLiner": string (max 20 words, what they do),
  "country": one of ${JSON.stringify(COUNTRY_CODES)} (where the startup is based),
  "sector": one of ${JSON.stringify(SECTORS)},
  "stage": one of ${JSON.stringify(STAGES)},
  "teamSize": number,
  "needs": array of ${JSON.stringify(NEEDS)} (what they are looking for),
  "targetMarkets": array of country codes they want to expand into (not their home country),
  "ask": string or null (e.g. "US$150k"),
  "traction": string or null (one short line)
}
If something is not stated, make the most reasonable guess from context.`;

export function posterPrompt(today: string) {
  return `This image or document is a poster, post or page announcing a startup opportunity in Southeast Asia.
Today is ${today}. Extract it as ONE JSON object only, no prose:
{
  "name": string, "org": string,
  "country": one of ${JSON.stringify(COUNTRY_CODES)} (where it is run),
  "type": one of ["grant","investor","accelerator","partner","talent","programme"],
  "stages": array of ${JSON.stringify(STAGES)},
  "sectors": array of ${JSON.stringify(SECTORS)} or the string "any",
  "openToAllAsean": boolean,
  "offers": array of ${JSON.stringify(NEEDS)},
  "amount": string (short),
  "deadline": "YYYY-MM-DD" or "rolling",
  "url": string or null,
  "summary": string (max 20 words)
}`;
}

export function cleanOpportunity(raw: Record<string, unknown>): Opportunity {
  const country = pickCountry(raw.country, "MY");
  const stages = pickMany<Stage>(raw.stages, STAGES);
  const sectors = raw.sectors === "any" ? "any" : pickMany<Sector>(raw.sectors, SECTORS);
  const offers = pickMany<Need>(raw.offers, NEEDS);
  const deadline = /^\d{4}-\d{2}-\d{2}$/.test(String(raw.deadline)) ? String(raw.deadline) : "rolling";
  return {
    id: "imp-" + Math.random().toString(36).slice(2, 9),
    name: String(raw.name || "Imported opportunity").slice(0, 80),
    org: String(raw.org || "Unknown").slice(0, 60),
    country,
    type: pick<OppType>(raw.type, ["grant", "investor", "accelerator", "partner", "talent", "programme"], "programme"),
    stages: stages.length ? stages : [...STAGES],
    sectors: Array.isArray(sectors) && sectors.length === 0 ? "any" : sectors,
    openTo: raw.openToAllAsean === false ? [country] : "ASEAN",
    offers: offers.length ? offers : ["mentorship"],
    amount: String(raw.amount || "See source").slice(0, 40),
    deadline,
    url: raw.url ? (/^https?:\/\//.test(String(raw.url)) ? String(raw.url) : `https://${raw.url}`) : "#",
    summary: String(raw.summary || "").slice(0, 160),
    imported: true,
  };
}

// ── Sample answers, used when no API key is set ─────────────
export const SAMPLE_PROFILE: Profile = {
  name: "PadiGuard",
  oneLiner: "Phone-photo AI that warns rice farmers about pest outbreaks before they spread.",
  country: "ID",
  sector: "agritech",
  stage: "pre-seed",
  teamSize: 2,
  needs: ["funding", "mentorship", "pilot-partner"],
  targetMarkets: ["MY", "VN"],
  ask: "US$150k",
  traction: "1,200 farmers in West Java, 3 co-op partners",
};
