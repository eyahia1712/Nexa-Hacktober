import Link from "next/link";
import { LogoLink } from "../Brand";
import { LanguageMenu } from "../ui";
import { Icon } from "../Icon";
import { NotificationBell } from "../NotificationBell";
import { WhoAmI } from "./WhoAmI";
import { ROLE_LABEL, type NexaEvent, type Role } from "@/lib/types";

export const SHELL = "mx-auto w-full max-w-[1120px] px-4 sm:px-6";
export const INPUT =
  "mt-1.5 h-11 w-full rounded-lg border border-line-strong bg-white px-3 text-[14px] font-medium normal-case tracking-normal text-ink outline-none transition placeholder:text-ink-3 focus:border-blue focus:ring-4 focus:ring-blue-soft";

/** Host keys, one per event created in this browser. They unlock the guest list. */
export const HOSTING_KEY = "nexa.hosting";

/** Role colours, everywhere: blue for startups, teal for investors, gold for talent. */
export const ROLE_TONE: Record<Role, string> = { startup: "bg-blue-soft text-blue", vc: "bg-teal-soft text-teal-deep", talent: "bg-gold-soft text-gold-deep" };
export const ROLE_TEXT: Record<Role, string> = { startup: "text-blue", vc: "text-teal", talent: "text-gold-deep" };
export const ROLE_CHIP: Record<Role, "blue" | "teal" | "gold"> = { startup: "blue", vc: "teal", talent: "gold" };

/** "Startup + Talent" */
export const rolesLabel = (roles: Role[]) => roles.map((r) => ROLE_LABEL[r]).join(" + ");

/** One small pill per role. */
export function RolePills({ roles }: { roles: Role[] }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {roles.map((r) => (
        <span key={r} className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${ROLE_TONE[r]}`}>{ROLE_LABEL[r]}</span>
      ))}
    </span>
  );
}

export function EventsHeader({ action = true }: { action?: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
      <div className={`${SHELL} flex items-center gap-4 py-3`}>
        <LogoLink size={24} />
        <nav className="flex items-center gap-1">
          <Link href="/events" className="micro px-2 py-2 text-ink-2 transition-colors hover:text-ink">Events</Link>
          <Link href="/dashboard" className="micro hidden px-2 py-2 text-ink-2 transition-colors hover:text-ink sm:block">Opportunities</Link>
          <Link href="/me" className="micro px-2 py-2 text-ink-2 transition-colors hover:text-ink">Me</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          <LanguageMenu compact />
          <WhoAmI />
          {action && (
            <Link href="/events/new" className="btn btn-blue min-h-9 px-3 text-[13px]">
              <Icon name="plus" size={15} /> <span className="hidden sm:inline">Create event</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

// Event times are wall-clock in the event's city, so parse and format them as local, never as UTC.
const at = (s: string) => new Date(s);
export const fmtDay = (s: string) => at(s).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
export const fmtTime = (s: string) => at(s).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
export const fmtRange = (e: Pick<NexaEvent, "start" | "end">) =>
  e.start.slice(0, 10) === e.end.slice(0, 10)
    ? `${fmtDay(e.start)} · ${fmtTime(e.start)} – ${fmtTime(e.end)}`
    : `${fmtDay(e.start)} ${fmtTime(e.start)} – ${fmtDay(e.end)} ${fmtTime(e.end)}`;
export const isPast = (e: Pick<NexaEvent, "end">) => at(e.end).getTime() < Date.now();
/** Happening right now: between doors open and close. */
export const isLive = (e: Pick<NexaEvent, "start" | "end">) => at(e.start).getTime() <= Date.now() && !isPast(e);

/** Date tile, like a torn calendar page. */
export function DateTile({ start, big }: { start: string; big?: boolean }) {
  const d = at(start);
  return (
    <div className={`shrink-0 overflow-hidden rounded-xl border border-line text-center ${big ? "w-16" : "w-14"}`}>
      <p className="micro bg-red py-0.5 text-[10px] text-white">{d.toLocaleDateString("en-GB", { month: "short" })}</p>
      <p className={`bg-white font-mono font-semibold leading-none ${big ? "py-2.5 text-[26px]" : "py-2 text-[22px]"}`}>{d.getDate()}</p>
    </div>
  );
}

const CHIP_ON = { blue: "border-blue bg-blue text-white", teal: "border-teal bg-teal text-white", gold: "border-gold bg-gold text-ink" };
const CHIP_HOVER = { blue: "hover:border-blue", teal: "hover:border-teal", gold: "hover:border-gold" };

export function Chip({ on, onClick, children, tone = "blue" }: { on: boolean; onClick: () => void; children: React.ReactNode; tone?: "blue" | "teal" | "gold" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition ${on ? CHIP_ON[tone] : `border-line text-ink-2 ${CHIP_HOVER[tone]}`}`}
    >
      {children}
    </button>
  );
}

export const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
