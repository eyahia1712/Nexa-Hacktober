"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AppHeader } from "@/components/AppHeader";
import { Icon, type IconName } from "@/components/Icon";
import { BTN_SAFFRON, INPUT, Micro } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { createAccount, getSession, guestSession, loadProfile, signIn } from "@/lib/store";
import { cn } from "@/lib/utils";

type Path = "upload" | "form" | "signin";

/**
 * "See my opportunities" lands here: three ways to start, like Nexa's
 * sample person / upload CV / answer questions. The sample needs no account;
 * the other two ask for one first.
 */
export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [path, setPath] = useState<Path | null>(null);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signingIn = path === "signin";

  useEffect(() => {
    if (path) formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [path]);

  const choose = (p: Path) => {
    setError(null);
    // Already signed in with a real account: no need to ask again.
    const s = getSession();
    if (p !== "signin" && s && !s.guest) {
      router.push(`/start?mode=${p}`);
      return;
    }
    setPath(p);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password || (!signingIn && (!name.trim() || !company.trim()))) return setError(t("auth.missing"));
    if (password.length < 6) return setError(t("auth.short"));
    setBusy(true);
    try {
      if (signingIn) {
        const s = await signIn(email, password);
        router.push(loadProfile(s.email) ? "/dashboard" : "/start");
      } else {
        await createAccount(name, company, email, password);
        router.push(`/start?mode=${path}`);
      }
    } catch (err) {
      setError((err as Error).message === "exists" ? t("auth.exists") : t("auth.wrong"));
      setBusy(false);
    }
  };

  const options: { id: "sample" | "upload" | "form"; icon: IconName; color: string; title: string; line: string; cta: string }[] = [
    { id: "sample", icon: "flag", color: "#22d41b", title: t("auth.opt1t"), line: t("auth.opt1s"), cta: t("auth.opt1b") },
    { id: "upload", icon: "upload", color: "#0A97D9", title: t("auth.opt2t"), line: t("auth.opt2s"), cta: t("auth.opt2b") },
    { id: "form", icon: "edit", color: "#FD6925", title: t("auth.opt3t"), line: t("auth.opt3s"), cta: t("auth.opt3b") },
  ];

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <AppHeader />
      <main className="mx-auto w-full max-w-[1100px] px-5 pt-10 pb-20 md:px-8">
        <Micro>{t("auth.eyebrow")}</Micro>
        <h1 className="mt-3 text-[clamp(1.9rem,4vw,3rem)] leading-[1.05] font-medium tracking-[-0.025em]">{t("auth.title")}</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">{t("auth.sub")}</p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {options.map((o, i) => {
            const active = path === o.id;
            return (
              <article
                key={o.id}
                className={cn(
                  "nx-card nx-lift nx-rise flex flex-col overflow-hidden transition-shadow",
                  active && "ring-2 ring-saffron",
                  o.id === "sample" && "border-[#123012] bg-[#050a05] text-white",
                )}
                style={{ ["--i" as string]: i * 2 }}
              >
                {o.id === "sample" ? (
                  <div className="relative h-[120px] overflow-hidden">
                    <Image src="/kd/banner.jpg" alt="" fill sizes="360px" className="object-cover" style={{ transform: "scale(1.35)", transformOrigin: "50% 85%" }} />
                    <span className="absolute top-3 left-3 rounded-full bg-black/60 px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] uppercase">{t("start.kd.badge")}</span>
                  </div>
                ) : (
                  <div className="nx-dotgrid grid h-[120px] place-items-center border-b border-line bg-paper">
                    <span className="grid size-14 place-items-center rounded-2xl text-white shadow-[0_12px_24px_-12px_rgb(0_0_0/50%)]" style={{ background: o.color }}>
                      <Icon name={o.icon} size={26} />
                    </span>
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <p className="font-mono text-[11px] opacity-60">0{i + 1}</p>
                  <p className="mt-1 text-[19px] font-medium">{o.title}</p>
                  <p className={cn("mt-1.5 flex-1 text-[14px] leading-relaxed", o.id === "sample" ? "text-white/70" : "text-ink-2")}>{o.line}</p>
                  {o.id === "upload" ? (
                    <div className="mt-3 flex gap-1.5">
                      {["PDF", "PPTX", "DOCX"].map((f, j) => (
                        <span key={f} className="rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white" style={{ background: ["#E5243B", "#FD6925", "#2F6BFF"][j] }}>
                          {f}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <button
                    onClick={() => {
                      if (o.id === "sample") {
                        guestSession();
                        router.push("/start?sample=kd");
                      } else choose(o.id);
                    }}
                    className={cn(o.id === "sample" ? "nx-micro nx-focus inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 text-[#031a03] transition-transform hover:-translate-y-0.5" : BTN_SAFFRON, "mt-5 w-full")}
                    style={o.id === "sample" ? { background: "#22d41b" } : undefined}
                  >
                    {o.cta}
                    <Icon name="arrow" size={15} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {path ? (
          <form ref={formRef} onSubmit={submit} className="nx-card nx-rise mx-auto mt-8 max-w-2xl p-6 md:p-7">
            <p className="text-[20px] font-medium">{signingIn ? t("auth.signin") : t("auth.accountT")}</p>
            {!signingIn ? <p className="mt-1 text-[14px] text-ink-2">{t("auth.accountS")}</p> : null}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {!signingIn ? (
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
                  autoComplete={signingIn ? "current-password" : "new-password"}
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
              {signingIn ? t("auth.go") : t("auth.goCreate")}
            </button>
            <p className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-ink-3">
              <span className="inline-flex items-center gap-2">
                <Icon name="check" size={14} className="text-good" />
                {t("auth.local")}
              </span>
              {signingIn ? (
                <button type="button" onClick={() => setPath("form")} className="text-ink underline underline-offset-4">
                  {t("auth.new")} {t("auth.create")}
                </button>
              ) : null}
            </p>
          </form>
        ) : null}

        {!signingIn ? (
          <p className="mt-8 text-center text-[14px] text-ink-2">
            {t("auth.have")}{" "}
            <button onClick={() => choose("signin")} className="font-medium text-ink underline underline-offset-4">
              {t("auth.signin")}
            </button>
          </p>
        ) : null}
      </main>
    </div>
  );
}
