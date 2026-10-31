import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Fetching a URL that came from a user (a pasted link, or a website Gemma read in an
 * uploaded document) without letting it reach the server's own network:
 * - the host must resolve only to public addresses (checked by DNS, not by the URL text),
 * - every redirect is re-checked before it is followed,
 * - time and size are capped, and the body is read in chunks so a huge page can't fill memory.
 */
export type SafeFetch =
  | { ok: true; url: URL; type: string; body: Uint8Array }
  | { ok: false; reason: "bad-url" | "private" | "network" | "status" | "too-big" | "redirects"; status?: number };

export async function safeFetch(
  start: URL,
  { timeout = 8000, maxBytes = 3_000_000, maxRedirects = 3, protocols = ["https:", "http:"], headers = {} }: {
    timeout?: number;
    maxBytes?: number;
    maxRedirects?: number;
    protocols?: string[];
    headers?: Record<string, string>;
  } = {},
): Promise<SafeFetch> {
  let url = start;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    if (!protocols.includes(url.protocol) || url.username || url.password) return { ok: false, reason: "bad-url" };
    if (!(await isPublicHost(url.hostname))) return { ok: false, reason: "private" };
    let res: Response;
    try {
      res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(timeout), headers });
    } catch {
      return { ok: false, reason: "network" };
    }
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      await res.body?.cancel().catch(() => {});
      try {
        url = new URL(location, url);
      } catch {
        return { ok: false, reason: "bad-url" };
      }
      continue;
    }
    if (!res.ok) {
      await res.body?.cancel().catch(() => {});
      return { ok: false, reason: "status", status: res.status };
    }
    const body = await readCapped(res, maxBytes);
    if (!body) return { ok: false, reason: "too-big" };
    return { ok: true, url, type: (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase(), body };
  }
  return { ok: false, reason: "redirects" };
}

async function readCapped(res: Response, maxBytes: number): Promise<Uint8Array | null> {
  const declared = Number(res.headers.get("content-length"));
  if (declared > maxBytes) {
    await res.body?.cancel().catch(() => {});
    return null;
  }
  const reader = res.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxBytes) {
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

/** Loopback, private, link-local (cloud metadata), carrier-grade NAT, benchmark and multicast ranges are out. */
function isPublicIp(ip: string): boolean {
  const v4 = ip.toLowerCase().startsWith("::ffff:") ? ip.slice(7) : ip;
  if (isIP(v4) === 4) {
    const [a, b] = v4.split(".").map(Number);
    return !(
      a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224
    );
  }
  // IPv6: unspecified, loopback, unique-local (fc00::/7, incl. Fly's fdaa:: private network), link-local.
  const x = ip.toLowerCase();
  return !(x === "::" || x === "::1" || x.startsWith("fc") || x.startsWith("fd") || /^fe[89ab]/.test(x));
}
