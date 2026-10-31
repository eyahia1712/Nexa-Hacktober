import Link from "next/link";

/** The door: an open arch in the ASEAN colours, with a gold path leading through. */
export function Mark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden className="shrink-0">
      <rect width="40" height="40" rx="10" fill="#0033a0" />
      <path d="M9 34 V19 a11 11 0 0 1 22 0 V34 Z" fill="#fff" />
      <path d="M13.5 34 V19.5 a6.5 6.5 0 0 1 13 0 V34 Z" fill="#d0103a" />
      <path d="M17 34 L20 24 L23 34 Z" fill="#e9a41c" />
    </svg>
  );
}

/** Wordmark: "Nexa" with the emblem standing in for the door it opens. */
export function Wordmark({ size = 26 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-[0.28em] font-extrabold italic tracking-[-0.04em] text-ink" style={{ fontSize: size }}>
      <Mark size={size * 1.05} />
      Nexa
    </span>
  );
}

export function Logo({ size = 24 }: { size?: number }) {
  return (
    <Link href="/" aria-label="Nexa home" className="rounded-md focus-visible:outline-2 focus-visible:outline-blue">
      <Wordmark size={size} />
    </Link>
  );
}
