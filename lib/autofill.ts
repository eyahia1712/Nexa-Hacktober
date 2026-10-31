import "server-only";
import { gemma, hasKey, parseJson, type FilePart } from "./gemma";
import { oneOf, someOf, str } from "./people";
import { safeFetch } from "./safeFetch";
import { COUNTRY_CODES, ROLES, SECTORS, SENIORITY, SKILLS, STAGES, type Country, type Role, type Sector, type Seniority, type Skill, type Stage } from "./types";

/** What Gemma found. Empty fields are left out so they don't wipe what the person typed. */
export type Draft = {
  source: string;
  roles?: Role[];
  name?: string;
  email?: string;
  org?: string;
  country?: Country;
  note?: string;
  sector?: Sector;
  stage?: Stage;
  hiring?: Skill[];
  sectors?: Sector[];
  stages?: Stage[];
  ticket?: string;
  skills?: Skill[];
  seniority?: Seniority;
};

const PROMPT = `You fill in a registration profile for an ASEAN startup-ecosystem events platform, from a web page or document (pitch deck, company website, CV, portfolio, fund website or thesis).

Decide which roles the subject plays, primary first:
- "startup": a company building a product (company website, pitch deck, one-pager).
- "vc": an investor: VC fund, angel, CVC, or a programme that invests money.
- "talent": an individual's CV, résumé, portfolio or personal profile looking for work, a team or projects.
A subject can have two roles: a CV of someone who also runs their own startup is ["talent","startup"]; a founder who angel-invests is ["startup","vc"]. Never guess a role the source doesn't support.

Reply with ONLY this JSON, no prose:
{
  "roles": ["startup" | "vc" | "talent", ...],
  "name": "the person's full name if the source is about one person, or the clearly named founder / contact; else \\"\\"",
  "email": "only if an email address is written in the source; else \\"\\"",
  "org": "startup name, fund name, or for talent the current employer or school (\\"Freelance\\" if self-employed)",
  "country": "${COUNTRY_CODES.join(" | ")}, where they are based; \\"\\" if unclear",
  "note": "one plain sentence: for a startup what it builds, for an investor who they want to meet, for talent what they are looking for",
  "sector": "startup only: ${SECTORS.join(" | ")}",
  "stage": "startup only: ${STAGES.join(" | ")}; judge from traction and funding mentioned",
  "hiring": ["startup only, from job or careers mentions: ${SKILLS.join(" | ")}"],
  "sectors": ["investor: sectors they back; talent: sectors they want or have worked in: ${SECTORS.join(" | ")}"],
  "stages": ["investor only: ${STAGES.join(" | ")}"],
  "ticket": "investor only: typical cheque if stated, like \\"US$ 100k–500k\\"; else \\"\\"",
  "skills": ["talent only: ${SKILLS.join(" | ")}"],
  "seniority": "talent only: ${SENIORITY.join(" | ")}, from years of experience and titles"
}`;

export async function autofill(input: unknown): Promise<{ draft: Draft } | { error: string; status: number }> {
  if (!hasKey()) return { error: "Autofill needs Gemma: add GEMINI_API_KEY to .env.local.", status: 400 };
  const i = (input ?? {}) as { url?: unknown; file?: { mime?: unknown; data?: unknown; name?: unknown } };

  let prompt = PROMPT;
  let files: FilePart[] = [];
  let source = "";
  if (i.file && typeof i.file.data === "string") {
    const mime = str(i.file.mime, 60);
    if (mime !== "application/pdf" && !mime.startsWith("image/")) return { error: "Upload a PDF or an image.", status: 400 };
    if (i.file.data.length > 11_000_000) return { error: "That file is over 8 MB.", status: 400 };
    files = [{ mime, data: i.file.data }];
    source = str(i.file.name, 80) || "your file";
  } else if (typeof i.url === "string" && i.url.trim()) {
    const page = await readPage(i.url.trim());
    if ("error" in page) return { error: page.error, status: 400 };
    source = page.host;
    if (page.pdf) files = [{ mime: "application/pdf", data: page.pdf }];
    else prompt += `\n\nWeb page ${page.url}:\n${page.text}`;
  } else {
    return { error: "Paste a link or upload a PDF.", status: 400 };
  }

  try {
    const raw = parseJson<Record<string, unknown>>(await gemma(prompt, files));
    return { draft: clean(raw, source) };
  } catch (e) {
    console.error(e);
    return { error: "Gemma couldn't read that. Try a PDF, or fill the form by hand.", status: 502 };
  }
}

function clean(raw: Record<string, unknown>, source: string): Draft {
  const d: Draft = { source };
  const roles = someOf<Role>(raw.roles, ROLES);
  if (roles.length) d.roles = roles;
  const text = (k: string, max: number) => {
    const v = str(raw[k], max);
    if (v) (d as Record<string, unknown>)[k] = v;
  };
  text("name", 100);
  text("org", 120);
  text("note", 300);
  text("ticket", 60);
  const email = str(raw.email, 160).toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) d.email = email;
  const country = oneOf<Country>(str(raw.country, 4).toUpperCase(), COUNTRY_CODES);
  if (country) d.country = country;
  const sector = oneOf<Sector>(str(raw.sector, 20).toLowerCase(), SECTORS);
  if (sector) d.sector = sector;
  const stage = oneOf<Stage>(str(raw.stage, 20).toLowerCase(), STAGES);
  if (stage) d.stage = stage;
  const seniority = oneOf<Seniority>(str(raw.seniority, 20).toLowerCase(), SENIORITY);
  if (seniority) d.seniority = seniority;
  for (const [k, list] of [["hiring", SKILLS], ["skills", SKILLS], ["sectors", SECTORS], ["stages", STAGES]] as const) {
    const v = someOf<string>(Array.isArray(raw[k]) ? (raw[k] as unknown[]).map((x) => String(x).toLowerCase()) : [], list);
    if (v.length) (d as Record<string, unknown>)[k] = v;
  }
  return d;
}

// ── reading a web page safely ────────────────────────────────
const FAILED = {
  "bad-url": "Only plain http and https links work.",
  private: "That address isn't a public website.",
  network: "Couldn't open that link. Check it, or upload a PDF instead.",
  "too-big": "That page is too big to read.",
  redirects: "Too many redirects.",
} as const;

/** A public web page (or PDF) for Gemma. safeFetch keeps a pasted link off the server's own network. */
async function readPage(input: string): Promise<{ url: string; host: string; text: string; pdf?: string } | { error: string }> {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
  } catch {
    return { error: "That doesn't look like a link." };
  }
  if (/(^|\.)linkedin\.com$/i.test(url.hostname)) return { error: "LinkedIn blocks automated reading. Save your profile as PDF and upload it." };

  const r = await safeFetch(url, { headers: { "User-Agent": "NexaBot/0.1 (+profile autofill)", Accept: "text/html,application/pdf;q=0.9,*/*;q=0.5" } });
  if (!r.ok) return { error: r.reason === "status" ? `That site answered ${r.status}. Try another page or a PDF.` : FAILED[r.reason] };
  if (r.type === "application/pdf") return { url: r.url.href, host: r.url.hostname, text: "", pdf: Buffer.from(r.body).toString("base64") };
  if (!r.type.includes("html") && !r.type.startsWith("text/")) return { error: "That link isn't a web page or a PDF." };
  const text = htmlToText(new TextDecoder().decode(r.body));
  if (text.length < 80) return { error: "That page has almost no text (it may need JavaScript). Try a PDF." };
  return { url: r.url.href, host: r.url.hostname.replace(/^www\./, ""), text };
}

function htmlToText(html: string): string {
  const meta = [...html.matchAll(/<meta[^>]+(?:name|property)=["'](?:description|og:description|og:title)["'][^>]*content=["']([^"']*)["']/gi)].map((m) => m[1]);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  const mails = [...new Set([...html.matchAll(/mailto:([^"'?\s>]+)/gi)].map((m) => m[1]))].slice(0, 3);
  const body = html
    .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|section|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
  return [`Title: ${title.trim()}`, meta.length ? `Description: ${meta.join(" · ")}` : "", mails.length ? `Emails on page: ${mails.join(", ")}` : "", body]
    .filter(Boolean)
    .join("\n")
    .slice(0, 15000);
}
