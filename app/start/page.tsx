"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AppHeader } from "@/components/AppHeader";
import { CompanyCard } from "@/components/CompanyCard";
import { Icon } from "@/components/Icon";
import { BTN_GHOST, BTN_INK, BTN_SAFFRON, INPUT, Loading, Micro } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { KD_PROFILE } from "@/lib/samples";
import { companyFor, getSession, guestSession, loadProfile, saveProfile, saveRequest, type Session } from "@/lib/store";
import { COUNTRIES, COUNTRY_CODES, SECTORS, SECTOR_LABEL, STAGES, STAGE_LABEL, type Profile, type Request } from "@/lib/types";
import { cn, fileToBase64, logoToDataUrl } from "@/lib/utils";

type Mode = "sample" | "upload" | "form";

const blank = (company = ""): Profile => ({
  id: `me-${Date.now()}`,
  name: company,
  oneLiner: "",
  country: "MY",
  sectors: [],
  stage: "pre-seed",
  teamSize: 3,
  source: "form",
});

export default function StartPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<Mode>("sample");
  const [draft, setDraft] = useState<Profile | null>(null);
  const [found, setFound] = useState<Request | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let s = getSession();
    // "Try the sample" goes straight to KrackedDevs' dashboard, no account needed.
    if (params.get("sample") === "kd") {
      // Always a guest, so the sample never overwrites a real account's profile.
      s = s?.guest ? s : guestSession();
      // Only the profile: the dashboard then asks what KD is looking for.
      saveProfile(s.email, KD_PROFILE);
      saveRequest(s.email, null);
      router.replace("/dashboard");
      return;
    }
    if (!s) {
      router.replace("/login");
      return;
    }
    setSession(s);
    const wanted = params.get("mode");
    if (wanted === "upload") setMode("upload");
    if (wanted === "form") setDraft(blank(companyFor(s.email)));
    if (params.get("edit")) {
      const saved = loadProfile(s.email);
      if (saved) setDraft(saved);
    }
  }, [router]);

  const finish = (p: Profile, r?: Request | null) => {
    if (!session) return;
    const changedCompany = loadProfile(session.email)?.id !== p.id;
    saveProfile(session.email, p);
    // A new company starts with a clean "what do you need"; Gemma's guess from the deck pre-fills it.
    if (r) saveRequest(session.email, r);
    else if (changedCompany) saveRequest(session.email, null);
    router.push("/dashboard");
  };

  if (!session) return <div className="min-h-dvh bg-paper" />;

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <AppHeader />
      <main className="mx-auto w-full max-w-[1100px] px-5 pt-10 pb-20 md:px-8">
        <Micro>{t("start.eyebrow")}</Micro>
        <h1 className="mt-3 text-[clamp(1.9rem,4vw,3rem)] leading-[1.05] font-medium tracking-[-0.025em]">{draft ? t("start.reviewTitle") : t("start.title")}</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">{draft ? t("start.reviewSub") : t("start.sub")}</p>

        {draft ? (
          <Editor draft={draft} onChange={setDraft} onBack={() => setDraft(null)} onSave={(p) => finish(p, found)} />
        ) : (
          <>
            <div className="mt-8 inline-flex flex-wrap rounded-xl border border-line bg-card p-1" role="tablist">
              {(
                [
                  ["sample", "start.tab.sample"],
                  ["upload", "start.tab.upload"],
                  ["form", "start.tab.form"],
                ] as const
              ).map(([id, key]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={mode === id}
                  onClick={() => (id === "form" ? setDraft(blank(companyFor(session.email))) : setMode(id))}
                  className={cn("nx-focus min-h-10 rounded-lg px-4 text-[14px] transition-colors", mode === id ? "bg-ink text-paper" : "text-ink-2 hover:text-ink")}
                >
                  {t(key)}
                </button>
              ))}
            </div>
            <div className="mt-6">
              {mode === "sample" ? <SamplePick onOpen={() => finish(KD_PROFILE, null)} onReview={() => setDraft(KD_PROFILE)} /> : null}
              {mode === "upload" ? (
                <UploadBox
                  onDone={(p, r) => {
                    setFound(r);
                    setDraft(p);
                  }}
                />
              ) : null}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function SamplePick({ onOpen, onReview }: { onOpen: () => void; onReview: () => void }) {
  const { t } = useI18n();
  return (
    <div className="grid items-start gap-5 md:grid-cols-[1.3fr_1fr]">
      <article className="nx-card nx-rise flex flex-col overflow-hidden">
        <div className="relative h-[170px] bg-[#050a05]">
          <Image src="/kd/banner.jpg" alt="" fill sizes="600px" className="object-cover" />
        </div>
        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="relative size-12 overflow-hidden rounded-lg bg-black">
                <Image src="/kd/logo.png" alt="" fill sizes="48px" className="object-contain" />
              </span>
              <div>
                <p className="text-[20px] font-medium">KrackedDevs</p>
                <p className="text-[13.5px] text-ink-2">🇲🇾 Kuala Lumpur · {STAGE_LABEL[KD_PROFILE.stage]}</p>
              </div>
            </div>
            <span className="nx-micro inline-flex h-6 items-center rounded-full border border-line px-2.5 text-ink-2">{t("start.kd.badge")}</span>
          </div>
          <p className="mt-4 text-[14.5px] leading-relaxed text-ink-2">{KD_PROFILE.about}</p>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {KD_PROFILE.highlights!.map((h) => (
              <div key={h.label} className="rounded-lg border border-line bg-paper px-2.5 py-2">
                <p className="font-mono text-[16px] text-good">{h.value}</p>
                <p className="text-[11px] text-ink-3">{h.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button className={BTN_SAFFRON} onClick={onOpen}>
              {t("start.kd.open")}
            </button>
            <button className={BTN_GHOST} onClick={onReview}>
              {t("start.kd.review")}
            </button>
          </div>
          <p className="mt-4 text-[12px] text-ink-3">{t("start.kd.from")}</p>
        </div>
      </article>
      <CompanyCard profile={KD_PROFILE} className="nx-rise hidden md:block" />
    </div>
  );
}

function UploadBox({ onDone }: { onDone: (p: Profile, r: Request | null) => void }) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [text, setText] = useState("");

  const send = async (body: object) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok || !json.profile) throw new Error();
      onDone(json.profile, json.request);
    } catch {
      setError(t("start.failed"));
      setBusy(false);
    }
  };

  const upload = async (file?: File) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) return setError(t("start.formats"));
    await send({ uploads: [{ name: file.name, mime: file.type || "application/octet-stream", data: await fileToBase64(file) }] });
  };

  const sampleDeck = async () => {
    const blob = await (await fetch("/sample-deck.pdf")).blob();
    await upload(new File([blob], "padiguard-deck.pdf", { type: "application/pdf" }));
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            void upload(e.dataTransfer.files[0]);
          }}
          className={cn(
            "nx-dotgrid flex min-h-[260px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors",
            drag ? "border-ink bg-saffron-soft" : "border-line-strong bg-card",
          )}
        >
          <div className="grid size-12 place-items-center rounded-xl bg-saffron text-saffron-deep">
            <Icon name="upload" size={24} />
          </div>
          <p className="mt-4 text-[17px] font-medium">{busy ? t("start.reading") : t("start.drop")}</p>
          <p className="mt-1 text-[13px] text-ink-3">{t("start.formats")}</p>
          {busy ? (
            <div className="mt-5">
              <Loading label="Gemma 4" />
            </div>
          ) : (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button className={BTN_INK} onClick={() => input.current?.click()}>
                {t("start.choose")}
              </button>
              <button className={BTN_GHOST} onClick={() => void sampleDeck()}>
                {t("start.sampleDeck")}
              </button>
            </div>
          )}
          <input
            ref={input}
            type="file"
            accept=".pdf,.pptx,.docx,.txt,.md,image/*"
            className="hidden"
            onChange={(e) => {
              void upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {error ? <p className="mt-4 text-[13px] text-bad">{error}</p> : null}
        </div>

        <div className="nx-card p-5">
          <Micro>{t("start.orType")}</Micro>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder={t("start.typePh")} className={cn(INPUT, "h-auto py-2.5 leading-relaxed")} />
          <button className={cn(BTN_SAFFRON, "mt-3")} disabled={busy || text.trim().length < 15} onClick={() => void send({ text })}>
            <Icon name="spark" size={15} />
            {t("start.readText")}
          </button>
        </div>
      </div>

      <div className="nx-card p-6">
        <Micro>{t("start.howT")}</Micro>
        <ol className="mt-4 space-y-4">
          {(["start.how1", "start.how2", "start.how3"] as const).map((k, i) => (
            <li key={k} className="flex gap-3 text-[14px] leading-relaxed text-ink-2">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-stone font-mono text-[12px] text-ink-3">{i + 1}</span>
              {t(k)}
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-wrap gap-1.5">
          {["PDF", "PPTX", "DOCX", "PNG / JPG", "TXT"].map((f, i) => (
            <span key={f} className="rounded-md px-2 py-1 font-mono text-[11px] font-semibold text-white" style={{ background: ["#d0103a", "#c2410c", "#0033a0", "#0e7a4b", "#5c5a54"][i] }}>
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Editor({ draft, onChange, onBack, onSave }: { draft: Profile; onChange: (p: Profile) => void; onBack: () => void; onSave: (p: Profile) => void }) {
  const { t } = useI18n();
  const logoInput = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<Profile>) => onChange({ ...draft, ...patch });
  const ok = draft.name.trim().length > 1 && draft.oneLiner.trim().length > 3 && draft.sectors.length > 0;

  return (
    <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1.5fr_minmax(0,340px)]">
      <div className="nx-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <Micro>{t("f.name")}</Micro>
            <input className={INPUT} value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="PadiGuard" />
          </label>
          <label className="block">
            <Micro>{t("f.website")}</Micro>
            <input className={INPUT} value={draft.website ?? ""} onChange={(e) => set({ website: e.target.value || undefined })} placeholder="https://" />
          </label>
          <label className="block sm:col-span-2">
            <Micro>{t("f.oneLiner")}</Micro>
            <input className={INPUT} value={draft.oneLiner} onChange={(e) => set({ oneLiner: e.target.value })} placeholder="AI that warns rice farmers about pests before they spread." />
          </label>
          <label className="block">
            <Micro>{t("f.country")}</Micro>
            <select className={INPUT} value={draft.country} onChange={(e) => set({ country: e.target.value as Profile["country"] })}>
              {COUNTRY_CODES.map((c) => (
                <option key={c} value={c}>
                  {COUNTRIES[c].flag} {COUNTRIES[c].name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <Micro>{t("f.stage")}</Micro>
              <select className={INPUT} value={draft.stage} onChange={(e) => set({ stage: e.target.value as Profile["stage"] })}>
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <Micro>{t("f.team")}</Micro>
              <input type="number" min={1} className={cn(INPUT, "font-mono")} value={draft.teamSize} onChange={(e) => set({ teamSize: Math.max(1, Number(e.target.value) || 1) })} />
            </label>
          </div>
        </div>

        <Micro className="mt-6">{t("f.sectors")}</Micro>
        <div className="mt-3 flex flex-wrap gap-2">
          {SECTORS.map((s) => {
            const on = draft.sectors.includes(s);
            return (
              <button
                key={s}
                onClick={() => set({ sectors: on ? draft.sectors.filter((x) => x !== s) : [...draft.sectors, s].slice(-3) })}
                aria-pressed={on}
                className={cn(
                  "nx-focus inline-flex h-8 items-center rounded-full border px-3 text-[13px] transition-colors",
                  on ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink-2 hover:border-line-strong",
                )}
              >
                {SECTOR_LABEL[s]}
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-[auto_1fr]">
          <div>
            <Micro>{t("f.logo")}</Micro>
            <button
              onClick={() => logoInput.current?.click()}
              className="nx-focus mt-2 grid size-[86px] place-items-center overflow-hidden rounded-xl border-2 border-dashed border-line-strong bg-paper text-ink-3 hover:border-ink"
            >
              {draft.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.logo} alt="" className="max-h-full max-w-full object-contain p-1.5" />
              ) : (
                <span className="flex flex-col items-center gap-1 text-[11px]">
                  <Icon name="image" size={20} />
                  {t("f.logoBtn")}
                </span>
              )}
            </button>
            <input
              ref={logoInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) set({ logo: await logoToDataUrl(f), banner: undefined });
              }}
            />
          </div>
          <label className="block">
            <Micro>{t("f.about")}</Micro>
            <textarea rows={3} className={cn(INPUT, "h-auto py-2.5 leading-relaxed")} value={draft.about ?? ""} onChange={(e) => set({ about: e.target.value || undefined })} />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button className={BTN_SAFFRON} disabled={!ok} onClick={() => onSave({ ...draft, name: draft.name.trim(), oneLiner: draft.oneLiner.trim() })}>
            {t("f.save")}
          </button>
          <button className={BTN_GHOST} onClick={onBack}>
            {t("f.back")}
          </button>
          {!ok ? <p className="text-[13px] text-ink-3">{t("f.need")}</p> : null}
        </div>
      </div>

      <div className="lg:sticky lg:top-20">
        <CompanyCard profile={{ ...draft, name: draft.name || "Your company", sectors: draft.sectors.length ? draft.sectors : ["saas"] }} />
      </div>
    </div>
  );
}
