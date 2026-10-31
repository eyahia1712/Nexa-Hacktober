import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { gemma, hasKey, parseJson, type FilePart } from "./gemma";
import { oneOf, someOf, str } from "./people";
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
const MAX_BYTES = 3_000_000;

/**
 * Fetches a public web page for Gemma. Only http(s), only public addresses (checked on
 * every redirect), 8 s and 3 MB at most, so a pasted link can't reach the server's own network.
 */
async function readPage(input: string): Promise<{ url: string; host: string; text: string; pdf?: string } | { error: string }> {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
  } catch {
    return { error: "That doesn't look like a link." };
  }
  if (/(^|\.)linkedin\.com$/i.test(url.hostname)) return { error: "LinkedIn blocks automated reading. Save your profile as PDF and upload it." };

  for (let hop = 0; hop < 4; hop++) {
    if (url.protocol !== "https:" && url.protocol !== "http:") return { error: "Only http and https links work." };
    if (url.username || url.password) return { error: "Links with a username or password aren't allowed." };
    if (!(await isPublicHost(url.hostname))) return { error: "That address isn't a public website." };
    let res: Response;
    try {
      res = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "NexaBot/0.1 (+profile autofill)", Accept: "text/html,application/pdf;q=0.9,*/*;q=0.5" },
      });
    } catch {
      return { error: "Couldn't open that link. Check it, or upload a PDF instead." };
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = new URL(res.headers.get("location")!, url);
      continue;
    }
    if (!res.ok) return { error: `That site answered ${res.status}. Try another page or a PDF.` };
    const type = res.headers.get("content-type") ?? "";
    const body = await readCapped(res);
    if (!body) return { error: "That page is too big to read." };
    if (type.includes("application/pdf")) return { url: url.href, host: url.hostname, text: "", pdf: Buffer.from(body).toString("base64") };
    if (!type.includes("html") && !type.startsWith("text/")) return { error: "That link isn't a web page or a PDF." };
    const text = htmlToText(new TextDecoder().decode(body));
    if (text.length < 80) return { error: "That page has almost no text (it may need JavaScript). Try a PDF." };
    return { url: url.href, host: url.hostname.replace(/^www\./, ""), text };
  }
  return { error: "Too many redirects." };
}

async function readCapped(res: Response): Promise<Uint8Array | null> {
  const reader = res.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

async function isPublicHost(host: string): Promise<boolean> {
  const h = host.replace(/^\[|\]$/g, "");
  if (/^localhost$|\.localhost$|\.local$|\.internal$/i.test(h)) return false;
  let addrs: string[];
  try {
    addrs = isIP(h) ? [h] : (await lookup(h, { all: true })).map((a) => a.address);
  } catch {
    return false;
  }
  return addrs.length > 0 && addrs.every(isPublicIp);
}

function isPublicIp(ip: string): boolean {
  const v4 = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  if (isIP(v4) === 4) {
    const [a, b] = v4.split(".").map(Number);
    return !(
      a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224
    );
  }
  const x = ip.toLowerCase();
  return !(x === "::" || x === "::1" || x.startsWith("fc") || x.startsWith("fd") || x.startsWith("fe8") || x.startsWith("fe9") || x.startsWith("fea") || x.startsWith("feb"));
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
