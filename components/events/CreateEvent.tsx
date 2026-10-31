"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "../Icon";
import { post, sectorLabel, store } from "@/lib/client";
import { COUNTRIES, COUNTRY_CODES, ROLE_LABEL, ROLES, SECTORS, type Country, type EventSummary, type Role, type Sector } from "@/lib/types";
import { Chip, EventsHeader, HOSTING_KEY, INPUT, ROLE_CHIP, SHELL, toggle } from "./ui";

export function CreateEvent() {
  const router = useRouter();
  const [f, setF] = useState({
    title: "",
    host: "",
    description: "",
    format: "in-person" as "in-person" | "online",
    country: "MY" as Country,
    city: "",
    venue: "",
    start: "",
    end: "",
    capacity: "",
    audience: [...ROLES] as Role[],
    sectors: [] as Sector[],
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await post<{ event: EventSummary; hostKey: string }>("/api/events", f);
      store.set(HOSTING_KEY, { ...store.get(HOSTING_KEY, {}), [r.event.id]: r.hostKey });
      router.push(`/events/${r.event.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper-2">
      <EventsHeader action={false} />
      <main className={`${SHELL} max-w-[760px] py-10`}>
        <p className="micro text-ink-3">Host an event</p>
        <h1 className="mt-2 text-[clamp(1.8rem,3.6vw,2.6rem)] font-semibold tracking-[-0.03em]">Bring the right people into one room.</h1>

        <form onSubmit={submit} className="box mt-8 space-y-5 p-5 sm:p-7">
          <input
            required
            value={f.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Event name"
            className="w-full border-0 bg-transparent text-[26px] font-semibold tracking-tight outline-none placeholder:text-ink-3/60"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="micro text-ink-3">
              Hosted by
              <input required value={f.host} onChange={(e) => set("host", e.target.value)} placeholder="Your organisation" className={INPUT} />
            </label>
            <label className="micro text-ink-3">
              Capacity
              <input type="number" min={1} value={f.capacity} onChange={(e) => set("capacity", e.target.value)} placeholder="No limit" className={INPUT} />
            </label>
            <label className="micro text-ink-3">
              Starts
              <input required type="datetime-local" value={f.start} onChange={(e) => set("start", e.target.value)} className={INPUT} />
            </label>
            <label className="micro text-ink-3">
              Ends
              <input required type="datetime-local" min={f.start} value={f.end} onChange={(e) => set("end", e.target.value)} className={INPUT} />
            </label>
          </div>

          <div>
            <p className="micro text-ink-3">Where</p>
            <div className="mt-1.5 flex w-fit rounded-xl border border-line bg-paper-2 p-1">
              {(["in-person", "online"] as const).map((k) => (
                <button
                  type="button"
                  key={k}
                  onClick={() => set("format", k)}
                  className={`rounded-lg px-4 py-1.5 text-[13px] font-semibold transition ${f.format === k ? "bg-white text-ink shadow-[0_2px_8px_-4px_rgb(0_0_0/0.3)]" : "text-ink-2 hover:text-ink"}`}
                >
                  {k === "online" ? "Online" : "In person"}
                </button>
              ))}
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_1fr]">
              <label className="micro text-ink-3">
                {f.format === "online" ? "Host country" : "Country"}
                <select value={f.country} onChange={(e) => set("country", e.target.value as Country)} className={INPUT}>
                  {COUNTRY_CODES.map((c) => (
                    <option key={c} value={c}>{COUNTRIES[c].flag} {COUNTRIES[c].name}</option>
                  ))}
                </select>
              </label>
              {f.format === "in-person" && (
                <label className="micro text-ink-3">
                  City
                  <input value={f.city} onChange={(e) => set("city", e.target.value)} placeholder="Kuala Lumpur" className={INPUT} />
                </label>
              )}
              <label className="micro text-ink-3 sm:col-span-2">
                {f.format === "online" ? "Join link" : "Venue"}
                <input
                  value={f.venue}
                  onChange={(e) => set("venue", e.target.value)}
                  placeholder={f.format === "online" ? "https://meet… (or “sent after registration”)" : "Building, street"}
                  className={INPUT}
                />
              </label>
            </div>
          </div>

          <label className="micro block text-ink-3">
            About
            <textarea
              value={f.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              placeholder="What happens, who should come, what they leave with."
              className={`${INPUT} h-auto py-2.5 leading-relaxed`}
            />
          </label>

          <div>
            <p className="micro text-ink-3">Who can register</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ROLES.map((r) => (
                <Chip key={r} on={f.audience.includes(r)} onClick={() => set("audience", toggle(f.audience, r))} tone={ROLE_CHIP[r]}>
                  {ROLE_LABEL[r]}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="micro text-ink-3">Sector focus <span className="normal-case tracking-normal text-ink-3/80">· none = every sector</span></p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SECTORS.map((s) => (
                <Chip key={s} on={f.sectors.includes(s)} onClick={() => set("sectors", toggle(f.sectors, s))}>
                  {sectorLabel(s)}
                </Chip>
              ))}
            </div>
          </div>

          {error && <p className="rounded-lg bg-red-soft px-4 py-3 text-[13px] font-semibold text-red">{error}</p>}
          <button disabled={busy || !f.audience.length} className="btn btn-blue w-full">
            {busy ? "Creating…" : <>Create event <Icon name="arrow" size={16} /></>}
          </button>
          <p className="text-center text-[12px] text-ink-3">You&apos;ll manage the guest list from this browser.</p>
        </form>
      </main>
    </div>
  );
}
