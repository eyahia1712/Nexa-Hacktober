"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { currentName } from "@/lib/client";

/** The account you're acting as on the events pages (KrackedDevs, Cradle Fund, your name). */
export function WhoAmI() {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => setName(currentName()), []);
  if (!name) return null;
  return (
    <Link href="/me" className="hidden items-center gap-2 rounded-md border border-line bg-card py-1 pr-3 pl-1 text-[13.5px] hover:border-line-strong sm:inline-flex" title="Your events profile">
      <span className="grid size-7 place-items-center rounded bg-asean font-mono text-[11px] text-white">{name.charAt(0).toUpperCase()}</span>
      <span className="max-w-[9rem] truncate">{name}</span>
    </Link>
  );
}
