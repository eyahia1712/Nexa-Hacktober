"use client";

import type { Profile, Request, TrackStage } from "./types";

/**
 * Demo accounts and data live in this browser only (localStorage).
 * Passwords are hashed with SHA-256 before they are stored. A real launch
 * would move this to a proper auth service.
 */

export type Session = { email: string; name: string; guest?: boolean };

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: the app still works for this visit */
  }
};

async function hash(text: string) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

type Account = { name: string; company: string; pass: string };

export async function createAccount(name: string, company: string, email: string, password: string): Promise<Session> {
  const accounts = read<Record<string, Account>>("nexa-accounts", {});
  const key = email.trim().toLowerCase();
  if (accounts[key]) throw new Error("exists");
  accounts[key] = { name: name.trim(), company: company.trim(), pass: await hash(password) };
  write("nexa-accounts", accounts);
  const session = { email: key, name: name.trim() };
  write("nexa-session", session);
  return session;
}

export async function signIn(email: string, password: string): Promise<Session> {
  const accounts = read<Record<string, Account>>("nexa-accounts", {});
  const key = email.trim().toLowerCase();
  const account = accounts[key];
  if (!account || account.pass !== (await hash(password))) throw new Error("wrong");
  const session = { email: key, name: account.name };
  write("nexa-session", session);
  return session;
}

export function companyFor(email: string) {
  return read<Record<string, Account>>("nexa-accounts", {})[email]?.company ?? "";
}

export function guestSession(): Session {
  const session = { email: "guest", name: "Guest", guest: true };
  write("nexa-session", session);
  return session;
}

/** A sample account that is not a company (the Cradle investor): signed in under its own name. */
export function sampleSession(email: string, name: string): Session {
  const session = { email, name };
  write("nexa-session", session);
  return session;
}

export const getSession = () => read<Session | null>("nexa-session", null);
export const signOut = () => write("nexa-session", null);

const k = (what: string, email: string) => `nexa-${what}:${email}`;
export const loadProfile = (email: string) => read<Profile | null>(k("profile", email), null);
export const saveProfile = (email: string, p: Profile | null) => write(k("profile", email), p);
export const loadRequest = (email: string) => read<Request | null>(k("request", email), null);
export const saveRequest = (email: string, r: Request | null) => write(k("request", email), r);
export const loadTracker = (email: string) => read<Record<string, TrackStage>>(k("tracker", email), {});
export const saveTracker = (email: string, t: Record<string, TrackStage>) => write(k("tracker", email), t);
