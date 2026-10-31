import "server-only";

/**
 * Finds a company's logo from its website: an <img> marked as a logo first,
 * then the apple-touch icon, the Open Graph image, and finally the favicon.
 * Returns it as a data URL so the browser never loads third-party files.
 */

const MAX = 400_000;
const TIMEOUT = 5000;

/** Only public https hosts, so a document can't point the server at internal addresses. */
function safeUrl(raw: string, base?: string): URL | null {
  try {
    const url = new URL(raw, base);
    if (url.protocol !== "https:") return null;
    const host = url.hostname;
    if (host === "localhost" || /^[\d.]+$/.test(host) || host.includes(":") || host.endsWith(".local") || host.endsWith(".internal")) return null;
    return url;
  } catch {
    return null;
  }
}

async function get(url: URL) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT), redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (Nexa logo finder)" } });
  if (!res.ok) return null;
  return res;
}

async function asDataUrl(url: URL): Promise<string | null> {
  const res = await get(url).catch(() => null);
  if (!res) return null;
  const type = (res.headers.get("content-type") ?? "").split(";")[0]!.trim();
  if (!type.startsWith("image/")) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0 || buf.length > MAX) return null;
  return `data:${type};base64,${buf.toString("base64")}`;
}

export async function findLogo(website?: string): Promise<string | undefined> {
  const home = website ? safeUrl(website) : null;
  if (!home) return undefined;
  const res = await get(home).catch(() => null);
  const html = res ? (await res.text()).slice(0, 400_000) : "";
  const base = res?.url ?? home.href;

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
    const url = safeUrl(c.replace(/&amp;/g, "&"), base);
    if (!url) continue;
    const data = await asDataUrl(url);
    if (data) return data;
  }
  return undefined;
}
