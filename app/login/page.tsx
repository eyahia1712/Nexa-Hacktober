"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AppHeader } from "@/components/AppHeader";
import { Icon } from "@/components/Icon";
import { BTN_SAFFRON, INPUT, Micro } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { createAccount, guestSession, loadProfile, signIn } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "create">("create");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password || (mode === "create" && (!name.trim() || !company.trim()))) return setError(t("auth.missing"));
    if (password.length < 6) return setError(t("auth.short"));
    setBusy(true);
    try {
      if (mode === "create") {
        await createAccount(name, company, email, password);
        router.push("/start");
      } else {
        const s = await signIn(email, password);
        router.push(loadProfile(s.email) ? "/dashboard" : "/start");
      }
    } catch (err) {
      setError((err as Error).message === "exists" ? t("auth.exists") : t("auth.wrong"));
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <AppHeader />
      <main className="mx-auto w-full max-w-[1100px] px-5 pt-10 pb-20 md:px-8">
        <Micro>{t("auth.eyebrow")}</Micro>
        <h1 className="mt-3 text-[clamp(1.9rem,4vw,3rem)] leading-[1.05] font-medium tracking-[-0.025em]">{t("auth.title")}</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">{t("auth.sub")}</p>

        <div className="mt-8 grid items-start gap-5 lg:grid-cols-[1.25fr_1fr]">
          <form onSubmit={submit} className="nx-card nx-rise p-6 md:p-7">
            <div className="inline-flex rounded-xl border border-line bg-paper p-1" role="tablist">
              {(["create", "signin"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => {
                    setMode(m);
                    setError(null);
                  }}
                  className={cn("nx-focus min-h-10 rounded-lg px-4 text-[14px] transition-colors", mode === m ? "bg-ink text-paper" : "text-ink-2 hover:text-ink")}
                >
                  {m === "create" ? t("auth.create") : t("auth.signin")}
                </button>
              ))}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {mode === "create" ? (
                <>
                  <label className="block">
                    <Micro>{t("auth.name")}</Micro>
                    <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Aisyah Rahman" />
                  </label>
                  <label className="block">
                    <Micro>{t("auth.company")}</Micro>
                    <input className={INPUT} value={company} onChange={(e) => setCompany(e.target.value)} autoComplete="organization" placeholder="PadiGuard" />
                  </label>
                </>
              ) : null}
              <label className="block sm:col-span-2">
                <Micro>{t("auth.email")}</Micro>
                <input className={INPUT} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@company.com" />
              </label>
              <label className="block sm:col-span-2">
                <Micro>{t("auth.password")}</Micro>
                <input
                  className={INPUT}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "create" ? "new-password" : "current-password"}
                  placeholder="••••••••"
                />
              </label>
            </div>

            {error ? (
              <p className="mt-4 flex items-center gap-2 text-[13.5px] text-bad">
                <Icon name="alert" size={16} />
                {error}
              </p>
            ) : null}

            <button type="submit" disabled={busy} className={cn(BTN_SAFFRON, "mt-6 min-h-11 w-full")}>
              {mode === "create" ? t("auth.goCreate") : t("auth.go")}
            </button>
            <p className="mt-4 flex items-center gap-2 text-[12.5px] text-ink-3">
              <Icon name="check" size={14} className="text-good" />
              {t("auth.local")}
            </p>
          </form>

          <div className="space-y-5">
            <article className="nx-rise relative overflow-hidden border border-line-strong/60 bg-[#050a05] text-white shadow-[0_16px_36px_-22px_rgb(0_0_0/55%)]" style={{ ["--i" as string]: 2 }}>
              <div className="relative h-[150px]">
                <Image src="/kd/banner.jpg" alt="" fill sizes="420px" className="object-cover" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(0_0_0/10%),rgb(0_0_0/75%))]" />
                <p className="absolute top-3 left-4 font-mono text-[10px] tracking-[0.14em] uppercase opacity-85">
                  Nexa
                  <br />
                  {"// "}
                  {t("start.kd.badge")}
                </p>
              </div>
              <div className="p-5">
                <p className="text-[19px] font-semibold">{t("auth.sampleT")}</p>
                <p className="mt-1 text-[14px] leading-relaxed text-white/70">{t("auth.sampleS")}</p>
                <button
                  onClick={() => {
                    guestSession();
                    router.push("/start?sample=kd");
                  }}
                  className="nx-micro nx-focus mt-4 inline-flex min-h-10 items-center gap-2 rounded-md px-4 text-[#031a03] transition-transform hover:-translate-y-0.5"
                  style={{ background: "#22d41b" }}
                >
                  {t("auth.sampleBtn")}
                  <Icon name="arrow" size={15} />
                </button>
              </div>
            </article>

            <div className="nx-card nx-rise p-6" style={{ ["--i" as string]: 4 }}>
              <Micro>{t("auth.perks")}</Micro>
              <ul className="mt-4 space-y-3">
                {(["auth.perk1", "auth.perk2", "auth.perk3"] as const).map((k, i) => (
                  <li key={k} className="flex items-center gap-3 text-[14.5px]">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full font-mono text-[12px] text-white" style={{ background: ["#0033a0", "#d0103a", "#0e7a4b"][i] }}>
                      0{i + 1}
                    </span>
                    {t(k)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
