import { SECTOR_LABEL, type Sector } from "./types";

/** Browser helpers shared by the workspace and the events pages. */
export const store = {
  get<T>(k: string, fallback: T): T {
    try {
      const v = localStorage.getItem(k);
      return v ? (JSON.parse(v) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
};

export async function post<T>(url: string, body: unknown, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Something went wrong");
  return json as T;
}

export const sectorLabel = (s: string) => SECTOR_LABEL[s as Sector] ?? s.charAt(0).toUpperCase() + s.slice(1);

/** The signed-in person's device key. No password: whoever holds the key is that person. */
export const PERSON_KEY = "nexa.person";
export const personHeaders = (): Record<string, string> => {
  const k = store.get<string | null>(PERSON_KEY, null);
  return k ? { "x-person-key": k } : {};
};

export async function getJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(url, { headers: { ...personHeaders(), ...headers } });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Something went wrong");
  return json as T;
}
