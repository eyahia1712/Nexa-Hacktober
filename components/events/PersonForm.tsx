"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import { post, sectorLabel } from "@/lib/client";
import { getSession, loadProfile } from "@/lib/store";
import {
  COUNTRIES,
  COUNTRY_CODES,
  ROLE_LABEL,
  SECTORS,
  SENIORITY,
  SENIORITY_LABEL,
  SKILL_LABEL,
  SKILLS,
  STAGE_LABEL,
  STAGES,
  type Country,
  type Person,
  type Role,
  type Sector,
  type Seniority,
  type Skill,
  type Stage,
} from "@/lib/types";
import { Chip, INPUT, ROLE_CHIP, toggle } from "./ui";

const ORG_LABEL: Record<Role, string> = { startup: "Startup", vc: "Fund / firm", talent: "Company / school" };
const NOTE_LABEL: Record<Role, string> = { startup: "One line on what you build", vc: "Who you want to meet", talent: "What you're looking for" };
const SUBMIT_TONE: Record<Role, string> = { startup: "btn-blue", vc: "bg-teal text-white hover:bg-teal-deep", talent: "bg-gold text-ink hover:bg-gold/90" };

export type PersonInput = {
  /** Every role, primary first. */
  roles: Role[];
  name: string;
  email: string;
  org: string;
  country: Country;
  note: string;
  sector: Sector | "";
  stage: Stage | "";
  sectors: Sector[];
  stages: Stage[];
  ticket: string;
  hiring: Skill[];
  skills: Skill[];
  seniority: Seniority | "";
};

/** What Gemma read from a website or PDF. Only the fields it found are set. */
export type Draft = Partial<PersonInput> & { source: string };

/**
 * One profile form for registering and for the Me page. Pick one role or several
 * (a founder who is also open to jobs is startup + talent). Gemma can fill it from a
 * website or a PDF, and a founder with a Nexa deck profile gets it prefilled.
 */
export function PersonForm({
  initial,
  roles: allowed,
  country = "MY",
  submit,
  busy,
  error,
  onSubmit,
}: {
  initial?: Person | null;
  /** Roles on offer: the event's audience, or every role on the Me page. */
  roles: Role[];
  country?: Country;
  submit: (roles: Role[]) => React.ReactNode;
  busy: boolean;
  error: string;
  onSubmit: (v: PersonInput) => void;
}) {
  const [f, setF] = useState<PersonInput>({
    roles: initial?.roles ?? [allowed[0]],
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    org: initial?.org ?? "",
    country: initial?.country ?? country,
    note: initial?.note ?? "",
    sector: initial?.sector ?? "",
    stage: initial?.stage ?? "",
    sectors: initial?.sectors ?? [],
    stages: initial?.stages ?? [],
    ticket: initial?.ticket ?? "",
    hiring: initial?.hiring ?? [],
    skills: initial?.skills ?? [],
    seniority: initial?.seniority ?? "",
  });
  const [filledFrom, setFilledFrom] = useState("");
  const set = <K extends keyof PersonInput>(k: K, v: PersonInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const has = (r: Role) => f.roles.includes(r);
  const primary = f.roles[0] ?? allowed[0];

  // Signed in to Nexa with a company profile? Start from that instead of a blank form.
  useEffect(() => {
    if (initial) return;
    const s = getSession();
    if (!s || s.guest) return;
    const p = loadProfile(s.email);
    setF((x) => ({
      ...x,
      name: x.name || s.name,
      email: x.email || s.email,
      ...(p && allowed.includes("startup")
        ? { roles: ["startup"], org: p.name, country: p.country, sector: p.sectors[0] ?? "", stage: p.stage, note: p.oneLiner }
        : {}),
    }));
    setFilledFrom(p ? `your Nexa profile (${p.name})` : "your Nexa account");
  }, [initial, allowed]);

  // Gemma's draft fills what it found and keeps what the person already typed elsewhere.
  const applyDraft = (d: Draft) => {
    const { source, ...fields } = d;
    const roles = (fields.roles ?? []).filter((r) => allowed.includes(r));
    setF((x) => {
      const next = { ...x };
      for (const [k, v] of Object.entries(fields) as [keyof PersonInput, PersonInput[keyof PersonInput]][]) {
        if (k === "roles" || v === undefined || v === "" || (Array.isArray(v) && !v.length)) continue;
        (next as Record<string, unknown>)[k] = v;
      }
      if (roles.length) next.roles = roles;
      return next;
    });
    setFilledFrom(source);
  };

  const missing =
    !f.roles.length ||
    (has("vc") && (!f.sectors.length || !f.stages.length)) ||
    (has("talent") && (!f.skills.length || !f.seniority)) ||
    (has("startup") && (!f.sector || !f.stage));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(f);
      }}
    >
      <Autofill onDraft={applyDraft} />

      {allowed.length > 1 && (
        <div className="mt-4">
          <p className="micro text-ink-3">
            I&apos;m… <span className="normal-case tracking-normal text-ink-3/80">· pick one or more</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {allowed.map((r) => (
              <Chip key={r} tone={ROLE_CHIP[r]} on={has(r)} onClick={() => set("roles", toggle(f.roles, r))}>
                {ROLE_LABEL[r]}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {filledFrom && (
        <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-teal-soft px-3 py-2 text-[12px] font-semibold text-teal-deep">
          <Icon name="spark" size={13} /> Filled from {filledFrom}. Check it before saving.
        </p>
      )}

      <div className="mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="micro text-ink-3">
            Your name
            <input required value={f.name} onChange={(e) => set("name", e.target.value)} className={INPUT} />
          </label>
          <label className="micro text-ink-3">
            Email
            <input required type="email" value={f.email} onChange={(e) => set("email", e.target.value)} className={INPUT} />
          </label>
          <label className="micro text-ink-3">
            {ORG_LABEL[has("startup") ? "startup" : primary]}
            <input required value={f.org} onChange={(e) => set("org", e.target.value)} className={INPUT} />
          </label>
          <label className="micro text-ink-3">
            Based in
            <select value={f.country} onChange={(e) => set("country", e.target.value as Country)} className={INPUT}>
              {COUNTRY_CODES.map((c) => (
                <option key={c} value={c}>{COUNTRIES[c].flag} {COUNTRIES[c].name}</option>
              ))}
            </select>
          </label>
        </div>

        {has("startup") && (
          <RoleSection role="startup" show={f.roles.length > 1}>
            <div className="grid grid-cols-2 gap-3">
              <label className="micro text-ink-3">
                Sector
                <select required value={f.sector} onChange={(e) => set("sector", e.target.value as Sector)} className={INPUT}>
                  <option value="" disabled>Pick one</option>
                  {SECTORS.map((s) => <option key={s} value={s}>{sectorLabel(s)}</option>)}
                </select>
              </label>
              <label className="micro text-ink-3">
                Stage
                <select required value={f.stage} onChange={(e) => set("stage", e.target.value as Stage)} className={INPUT}>
                  <option value="" disabled>Pick one</option>
                  {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
                </select>
              </label>
            </div>
            <ChipRow label="Hiring for" hint="optional" tone="gold" all={SKILLS} on={f.hiring} name={(k) => SKILL_LABEL[k]} onChange={(v) => set("hiring", v)} />
          </RoleSection>
        )}

        {has("vc") && (
          <RoleSection role="vc" show={f.roles.length > 1}>
            <ChipRow label={has("talent") ? "Sectors you back (and want to work in)" : "Sectors you back"} tone="teal" all={SECTORS} on={f.sectors} name={sectorLabel} onChange={(v) => set("sectors", v)} />
            <ChipRow label="Stages you invest in" tone="teal" all={STAGES} on={f.stages} name={(s) => STAGE_LABEL[s]} onChange={(v) => set("stages", v)} />
            <label className="micro block text-ink-3">
              Typical cheque
              <input value={f.ticket} onChange={(e) => set("ticket", e.target.value)} placeholder="US$ 100k–500k" className={INPUT} />
            </label>
          </RoleSection>
        )}

        {has("talent") && (
          <RoleSection role="talent" show={f.roles.length > 1}>
            <ChipRow label="Your skills" tone="gold" all={SKILLS} on={f.skills} name={(k) => SKILL_LABEL[k]} onChange={(v) => set("skills", v)} />
            <label className="micro block text-ink-3">
              Level
              <select required value={f.seniority} onChange={(e) => set("seniority", e.target.value as Seniority)} className={INPUT}>
                <option value="" disabled>Pick one</option>
                {SENIORITY.map((s) => <option key={s} value={s}>{SENIORITY_LABEL[s]}</option>)}
              </select>
            </label>
            {!has("vc") && (
              <ChipRow label="Sectors you want to work in" hint="none = any" tone="gold" all={SECTORS} on={f.sectors} name={sectorLabel} onChange={(v) => set("sectors", v)} />
            )}
          </RoleSection>
        )}

        <label className="micro block text-ink-3">
          {NOTE_LABEL[primary]}
          <input value={f.note} onChange={(e) => set("note", e.target.value)} className={INPUT} />
        </label>
      </div>

      {error && <p className="mt-3 rounded-lg bg-red-soft px-4 py-3 text-[13px] font-semibold text-red">{error}</p>}
      <button disabled={busy || missing} className={`btn mt-4 w-full ${SUBMIT_TONE[primary]}`}>
        {busy ? "Saving…" : submit(f.roles)}
      </button>
      {!initial && <p className="mt-2 text-center text-[11.5px] text-ink-3">No password: this browser remembers you.</p>}
    </form>
  );
}

function RoleSection({ role, show, children }: { role: Role; show: boolean; children: React.ReactNode }) {
  if (!show) return <>{children}</>;
  return (
    <fieldset className="space-y-3 rounded-xl border border-line p-3">
      <legend className="micro px-1 text-ink-3">As {ROLE_LABEL[role].toLowerCase()}</legend>
      {children}
    </fieldset>
  );
}

function ChipRow<T extends string>({
  label,
  hint,
  tone,
  all,
  on,
  name,
  onChange,
}: {
  label: string;
  hint?: string;
  tone: "blue" | "teal" | "gold";
  all: readonly T[];
  on: T[];
  name: (v: T) => string;
  onChange: (v: T[]) => void;
}) {
  return (
    <div>
      <p className="micro text-ink-3">
        {label} {hint && <span className="normal-case tracking-normal text-ink-3/80">· {hint}</span>}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {all.map((v) => (
          <Chip key={v} tone={tone} on={on.includes(v)} onClick={() => onChange(toggle(on, v))}>
            {name(v)}
          </Chip>
        ))}
      </div>
    </div>
  );
}

/** Paste a website or drop a PDF (deck, CV, fund thesis): Gemma picks the roles and fills the form. */
function Autofill({ onDraft }: { onDraft: (d: Draft) => void }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);

  const run = async (body: { url?: string; file?: { mime: string; data: string; name: string } }) => {
    setBusy(true);
    setError("");
    try {
      const r = await post<{ draft: Draft }>("/api/autofill", body);
      onDraft(r.draft);
      setOpen(false);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (f.size > 8_000_000) return setError("That file is over 8 MB.");
    const reader = new FileReader();
    reader.onload = () => run({ file: { mime: f.type || "application/pdf", data: String(reader.result).split(",")[1], name: f.name } });
    reader.readAsDataURL(f);
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-3 rounded-xl border border-dashed border-blue/40 bg-blue-soft/40 px-3.5 py-3 text-left transition hover:border-blue">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-blue text-white">
          <Icon name="spark" size={17} />
        </span>
        <span>
          <span className="block text-[13.5px] font-semibold text-ink">Fill it with Gemma</span>
          <span className="block text-[12px] text-ink-3">From your website, pitch deck, CV or fund thesis. Gemma picks your role too.</span>
        </span>
      </button>
    );
  }
  return (
    <div className="rounded-xl border border-blue/40 bg-blue-soft/40 p-3.5">
      <div className="flex items-center justify-between">
        <p className="text-[13.5px] font-semibold">Fill it with Gemma</p>
        <button type="button" onClick={() => setOpen(false)} className="micro text-ink-3 hover:text-blue">Close</button>
      </div>
      <div className="mt-2.5 flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (url.trim()) run({ url: url.trim() });
            }
          }}
          placeholder="https://yourstartup.com"
          className="h-10 min-w-0 flex-1 rounded-lg border border-line-strong bg-white px-3 text-[13.5px] outline-none focus:border-blue"
        />
        <button type="button" disabled={busy || !url.trim()} onClick={() => run({ url: url.trim() })} className="btn btn-blue min-h-10 px-3 text-[13px]">
          Read
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2 text-[12px] text-ink-3">
        <span>or</span>
        <button type="button" disabled={busy} onClick={() => file.current?.click()} className="font-semibold text-blue hover:underline disabled:opacity-40">
          upload a PDF
        </button>
        <span>(deck, CV, one-pager)</span>
        <input ref={file} type="file" accept="application/pdf,image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
      </div>
      {busy && (
        <p className="mt-2.5 flex items-center gap-2 text-[12.5px] font-semibold text-blue">
          <span className="dot size-1.5 rounded-full bg-blue" /> Gemma 4 is reading…
        </p>
      )}
      {error && <p className="mt-2.5 rounded-lg bg-red-soft px-3 py-2 text-[12.5px] font-semibold text-red">{error}</p>}
      <p className="mt-2 text-[11px] text-ink-3">LinkedIn blocks automated reading: save your profile as PDF and upload it instead.</p>
    </div>
  );
}
