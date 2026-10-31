/** Small stroke icons, drawn to one grid so they sit together. No emoji. */
const PATHS = {
  upload: "M12 16V4m0 0L7 9m5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3",
  check: "M5 12.5 10 17 19 7",
  x: "M6 6l12 12M18 6 6 18",
  alert: "M12 8v5m0 3.5v.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  bookmark: "M6 4h12v17l-6-4-6 4V4Z",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  external: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  chat: "M4 5h16v11H9l-5 4V5Z",
  send: "M4 12 20 4l-6 16-3-7-7-1Z",
  edit: "M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  back: "M19 12H5m5-5-5 5 5 5",
  calendar: "M5 6h14v14H5zM5 10h14M9 3v4m6-4v4",
  coin: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v8m-3-5.5c0-1 1.3-1.5 3-1.5s3 .7 3 1.7-1.2 1.4-3 1.8-3 .8-3 1.8 1.3 1.7 3 1.7 3-.5 3-1.5",
  doc: "M7 3h7l4 4v14H7zM14 3v4h4M10 12h5m-5 4h5",
  image: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9.5a1 1 0 1 0 0-.01",
  spark: "M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18M6 18l2.5-2.5m7-7L18 6",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z",
  copy: "M8 8h12v12H8zM16 8V4H4v12h4",
  trash: "M5 7h14M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3",
  flag: "M5 21V4m0 0h11l-2 4 2 4H5",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, className = "", stroke = 1.9 }: { name: IconName; size?: number; className?: string; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`} aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  );
}

/** Score ring used on every match: teal strong, gold partial, red not yet. */
export function ScoreRing({ score, verdict, size = 52 }: { score: number; verdict: "strong" | "partial" | "no"; size?: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const color = verdict === "strong" ? "#0e9f9a" : verdict === "partial" ? "#e9a41c" : "#d0103a";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 48 48" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="24" cy="24" r={r} fill="none" stroke="#edf1f7" strokeWidth="5" />
        {verdict !== "no" && (
          <circle
            cx="24"
            cy="24"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - score / 100)}
            style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1)" }}
          />
        )}
      </svg>
      <span className="absolute inset-0 grid place-items-center font-mono text-[13px] font-semibold" style={{ color }}>
        {verdict === "no" ? <Icon name="x" size={16} stroke={2.6} /> : score}
      </span>
    </div>
  );
}
