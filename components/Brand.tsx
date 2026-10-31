import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * The Nexa wordmark: a heavy italic "Nexa" with a saffron chevron riding
 * ahead of it. The next step, always one move in front.
 */
export function NexaLogo({ size = 28, className, inverted = false }: { size?: number; className?: string; inverted?: boolean }) {
  return (
    <span
      className={cn("relative inline-flex items-start leading-none select-none", inverted ? "text-[#f3f3f3]" : "text-ink", className)}
      style={{ fontSize: size }}
      role="img"
      aria-label="Nexa"
    >
      <span aria-hidden style={{ fontFamily: "var(--font-logo), var(--font-sans), sans-serif", fontStyle: "italic", fontWeight: 800, letterSpacing: "-0.035em" }}>
        Nexa
      </span>
      <svg aria-hidden viewBox="0 0 20 20" style={{ width: "0.42em", height: "0.42em", marginLeft: "0.06em", marginTop: "-0.02em" }}>
        <path d="M5 3l9 7-9 7" fill="none" stroke="var(--saffron)" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function LogoLink({ size = 26 }: { size?: number }) {
  return (
    <Link href="/" className="nx-focus" aria-label="Nexa home">
      <NexaLogo size={size} />
    </Link>
  );
}
