"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import Link from "next/link";

import { LogoLink } from "@/components/Brand";
import { NotificationBell } from "@/components/NotificationBell";
import { LanguageMenu } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { getSession, signOut, type Session } from "@/lib/store";
import { initials } from "@/lib/utils";

export function AppHeader({ children }: { children?: ReactNode }) {
  const { t } = useI18n();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => setSession(getSession()), []);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center gap-x-5 gap-y-2 px-5 py-2.5 md:px-8">
        <LogoLink size={24} />
        {children}
        <div className="ml-auto flex items-center gap-2">
          <Link href="/events" className="nx-micro nx-focus inline-flex min-h-9 items-center px-2 text-ink-2 hover:text-ink">
            Events
          </Link>
          <Link href="/me" className="nx-micro nx-focus inline-flex min-h-9 items-center px-2 text-ink-2 hover:text-ink">
            Me
          </Link>
          <NotificationBell />
          <LanguageMenu />
          {session ? (
            <>
              <span className="hidden items-center gap-2 rounded-md border border-line bg-card py-1 pr-3 pl-1 text-[13.5px] sm:inline-flex">
                <span className="grid size-7 place-items-center rounded bg-asean font-mono text-[11px] text-white">{session.guest ? "G" : initials(session.name)}</span>
                <span className="max-w-[8rem] truncate">{session.guest ? t("top.guest") : session.name}</span>
              </span>
              <button
                onClick={() => {
                  signOut();
                  router.push("/");
                }}
                className="nx-micro nx-focus inline-flex min-h-9 items-center px-2 text-ink-2 hover:text-ink"
              >
                {t("top.signout")}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
