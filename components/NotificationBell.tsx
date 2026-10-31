"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { ensurePerson, getJson, personHeaders, personKey, post } from "@/lib/client";
import type { Notice } from "@/lib/types";

const TONE: Record<Notice["type"], string> = { interest: "bg-blue-soft text-blue", match: "bg-teal-soft text-teal-deep", invite: "bg-gold-soft text-gold-deep" };
const ICON: Record<Notice["type"], "spark" | "check" | "mail"> = { interest: "spark", match: "check", invite: "mail" };

/** In-app notifications: interest, matches and invites. Polls while the page is open. */
export function NotificationBell() {
  const [items, setItems] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    if (!personKey()) return;
    getJson<{ items: Notice[]; unread: number }>("/api/me/notifications")
      .then((r) => {
        setItems(r.items);
        setUnread(r.unread);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    ensurePerson().then(() => {
      setSignedIn(!!personKey());
      load();
    });
    const t = setInterval(load, 15_000);
    const close = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => {
      clearInterval(t);
      document.removeEventListener("mousedown", close);
    };
  }, [load]);

  if (!signedIn) return null;

  const toggle = () => {
    setOpen(!open);
    if (!open && unread) {
      setUnread(0);
      post("/api/me/notifications", {}, { headers: personHeaders() }).catch(() => {});
    }
  };

  return (
    <div ref={box} className="relative">
      <button onClick={toggle} className="relative grid size-9 place-items-center rounded-lg border border-line text-ink-2 transition hover:border-blue hover:text-blue" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Zm4 4a2 2 0 0 0 4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-red px-1 font-mono text-[10.5px] font-semibold leading-5 text-white">{unread}</span>
        )}
      </button>
      {open && (
        <div className="box rise absolute right-0 top-11 z-50 max-h-[70vh] w-[min(360px,calc(100vw-32px))] overflow-y-auto p-2">
          <div className="flex items-center justify-between px-2 py-1.5">
            <p className="micro text-ink-3">Notifications</p>
            <Link href="/me" onClick={() => setOpen(false)} className="micro text-blue hover:underline">Me</Link>
          </div>
          {items.map((n) => (
            <Link key={n.id} href={n.link} onClick={() => setOpen(false)} className={`flex gap-3 rounded-xl p-2.5 transition hover:bg-paper-2 ${n.read ? "" : "bg-blue-soft/40"}`}>
              <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${TONE[n.type]}`}>
                <Icon name={ICON[n.type]} size={15} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] leading-snug text-ink">{n.text}</span>
                <span className="mt-0.5 block font-mono text-[10.5px] text-ink-3">{new Date(n.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </span>
            </Link>
          ))}
          {!items.length && <p className="px-2 py-6 text-center text-[13px] text-ink-3">Nothing yet. Interest, matches and invites show up here.</p>}
        </div>
      )}
    </div>
  );
}
