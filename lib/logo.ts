import "server-only";

import { safeFetch } from "./safeFetch";

/**
 * Finds a company's logo from its website: an <img> marked as a logo first,
 * then the apple-touch icon, the Open Graph image, and finally the favicon.
 * Returns it as a data URL so the browser never loads third-party files.
 */

const MAX = 400_000;
const MAX_HTML = 1_000_000;
const TIMEOUT = 5000;
const HEADERS = { "user-agent": "Mozilla/5.0 (Nexa logo finder)" };

/**
 * The website comes from a document a user uploaded, so it is untrusted: only https here,
 * and safeFetch checks every host and redirect against private and internal addresses.
 */
function parse(raw: string, base?: string): URL | null {
  try {
    const url = new URL(raw, base);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

const get = (url: URL, maxBytes: number) => safeFetch(url, { timeout: TIMEOUT, maxBytes, protocols: ["https:"], headers: HEADERS });

async function asDataUrl(url: URL): Promise<string | null> {
  const res = await get(url, MAX);
  if (!res.ok || !res.type.startsWith("image/") || res.body.length === 0) return null;
  return `data:${res.type};base64,${Buffer.from(res.body).toString("base64")}`;
}

export async function findLogo(website?: string): Promise<string | undefined> {
  const home = website ? parse(website) : null;
  if (!home) return undefined;
  const res = await get(home, MAX_HTML);
  const html = res.ok ? new TextDecoder().decode(res.body) : "";
  const base = res.ok ? res.url.href : home.href;

  const attr = (tag: string, name: string) => tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1];
  const candidates: string[] = [];
  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    const src = attr(tag, "src");
    if (src && /logo/i.test(tag) && !src.startsWith("data:")) candidates.push(src);
  }
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    if (/apple-touch-icon/i.test(tag)) candidates.push(attr(tag, "href") ?? "");
  }
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (/og:image/i.test(tag)) candidates.push(attr(tag, "content") ?? "");
  }
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    if (/rel=["'][^"']*icon/i.test(tag)) candidates.push(attr(tag, "href") ?? "");
  }
  candidates.push("/favicon.ico");

  for (const c of candidates.filter(Boolean).slice(0, 6)) {
    const url = parse(c.replace(/&amp;/g, "&"), base);
    if (!url) continue;
    const data = await asDataUrl(url);
    if (data) return data;
  }
  return undefined;
}
