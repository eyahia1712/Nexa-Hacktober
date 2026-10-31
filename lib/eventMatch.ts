import { COUNTRIES, ROLE_PLURAL, ROLES, SKILL_LABEL, STAGE_LABEL, type Fit, type IntroStatus, type NexaEvent, type Person, type Registration, type Role } from "./types";

/** The profile fields matching looks at. Persons and registrations both have them. */
type Side = Pick<Person, "role" | "roles" | "country" | "sector" | "stage" | "sectors" | "stages" | "hiring" | "skills">;

export type Intro = { startup: Registration; vc: Registration; score: number; reasons: string[]; status: IntroStatus };

export const hasRole = (p: Pick<Person, "role" | "roles">, r: Role) => (p.roles?.length ? p.roles : [p.role]).includes(r);

/** A person with two roles (say startup + talent) is matched once per role; the best pairing wins. */
const facets = (p: Side): Side[] => (p.roles?.length ? p.roles : [p.role]).map((role) => ({ ...p, role, roles: [role] }));

/**
 * Same idea as lib/match.ts: plain rules, never the AI, so every pairing can be explained.
 * Startup ↔ investor: does the fund back this sector and stage?
 * Startup ↔ startup: same sector means a partner or co-pilot; same country means shared customers or channels.
 * Investor ↔ investor: overlapping theses means a co-investor.
 * Startup ↔ talent: is the startup hiring their skills, in a sector they want?
 * Talent ↔ talent: complementary skills means a teammate.
 * Investor ↔ talent: not a fit; investors are here for companies.
 */
export function pairFit(a: Side, b: Side): Fit | null {
  const fits = facets(a)
    .flatMap((x) => facets(b).map((y) => onePair(x, y)))
    .filter((f): f is Fit => !!f)
    .sort((x, y) => y.score - x.score);
  if (!fits.length) return null;
  // Best pairing's reasons, plus the headline of any other way they fit.
  const reasons = [...new Set([...fits[0].reasons, ...fits.slice(1).map((f) => f.reasons[0])])].slice(0, 4);
  return { score: fits[0].score, reasons };
}

function onePair(a: Side, b: Side): Fit | null {
  if (a.role !== b.role) {
    const pick = (r: Role) => (a.role === r ? a : b.role === r ? b : null);
    const [s, v, t] = [pick("startup"), pick("vc"), pick("talent")];
    if (s && v) return founderInvestor(s, v);
    if (s && t) return startupTalent(s, t);
    return null;
  }
  if (a.role === "talent") return teammates(a, b);
  if (a.role === "startup") return startupPeers(a, b);
  const reasons: string[] = [];
  let score = 0;
  const sectors = (a.sectors ?? []).filter((x) => b.sectors?.includes(x));
  const stages = (a.stages ?? []).filter((x) => b.stages?.includes(x));
  if (sectors.length) {
    score += 30 + 10 * Math.min(2, sectors.length - 1);
    reasons.push(`Co-invest in ${sectors.slice(0, 2).map(cap).join(" + ")}`);
  }
  if (stages.length) {
    score += 25;
    reasons.push(`Both write ${STAGE_LABEL[stages[0]]} cheques`);
  }
  return score ? { score: Math.min(98, score), reasons } : null;
}

function startupPeers(a: Side, b: Side): Fit | null {
  const reasons: string[] = [];
  let score = 0;
  if (a.sector && a.sector === b.sector) {
    score += 45;
    reasons.push(`Both in ${cap(a.sector)}: partner or co-pilot`);
    if (a.country !== b.country) {
      score += 15;
      reasons.push(`Opens ${COUNTRIES[b.country].name}`);
    }
  }
  if (a.country === b.country) {
    score += score ? 20 : 30;
    reasons.push(score > 30 ? `Both in ${COUNTRIES[a.country].name}` : `Both building in ${COUNTRIES[a.country].name}: share customers or channels`);
  }
  if (score && a.stage && a.stage === b.stage) {
    score += 10;
    reasons.push(`Same stage (${STAGE_LABEL[a.stage]})`);
  }
  return score ? { score: Math.min(98, score), reasons } : null;
}

function founderInvestor(startup: Side, vc: Side): Fit | null {
  const reasons: string[] = [];
  let score = 0;
  if (startup.sector && vc.sectors?.includes(startup.sector)) {
    score += 50;
    reasons.push(`Backs ${cap(startup.sector)}`);
  }
  if (startup.stage && vc.stages?.includes(startup.stage)) {
    score += 35;
    reasons.push(`Writes ${STAGE_LABEL[startup.stage]} cheques`);
  }
  if (!score) return null;
  if (startup.country === vc.country) {
    score += 10;
    reasons.push(`Both in ${COUNTRIES[vc.country].name}`);
  } else {
    score += 5;
    reasons.push("Cross-border");
  }
  return { score, reasons };
}

function startupTalent(s: Side, t: Side): Fit | null {
  const reasons: string[] = [];
  let score = 0;
  const hit = (s.hiring ?? []).filter((k) => t.skills?.includes(k));
  if (hit.length) {
    score += 50;
    reasons.push(`Hiring ${hit.map((k) => SKILL_LABEL[k]).join(" + ")}`);
  }
  if (!t.sectors?.length) {
    if (score) score += 10;
  } else if (s.sector && t.sectors.includes(s.sector)) {
    score += 30;
    reasons.push(`${cap(s.sector)} is a sector they want`);
  }
  if (!score) return null;
  if (s.country === t.country) {
    score += 15;
    reasons.push(`Both in ${COUNTRIES[t.country].name}`);
  } else {
    score += 5;
    reasons.push("Cross-border / remote");
  }
  return { score: Math.min(98, score), reasons };
}

function teammates(a: Side, b: Side): Fit | null {
  const reasons: string[] = [];
  let score = 0;
  const mine = a.skills ?? [];
  const theirs = (b.skills ?? []).filter((k) => !mine.includes(k));
  if (theirs.length) {
    score += 40;
    reasons.push(`Complementary: brings ${theirs.slice(0, 2).map((k) => SKILL_LABEL[k]).join(" + ")}`);
  }
  const shared = (a.sectors ?? []).filter((x) => b.sectors?.includes(x));
  if (shared.length) {
    score += 25;
    reasons.push(`Both into ${shared.slice(0, 2).map(cap).join(" + ")}`);
  }
  if (score && a.country === b.country) {
    score += 10;
    reasons.push(`Both in ${COUNTRIES[a.country].name}`);
  }
  return score ? { score: Math.min(98, score), reasons } : null;
}

/** Best startup → investor intros first. Each startup gets at most `perStartup` investors. */
export function suggestIntros(regs: Registration[], perStartup = 3): Intro[] {
  const vcs = regs.filter((r) => hasRole(r, "vc"));
  return regs
    .filter((r) => hasRole(r, "startup"))
    .flatMap((s) =>
      vcs
        .filter((v) => v.personId !== s.personId)
        .map((v) => {
          const f = founderInvestor({ ...s, role: "startup" }, { ...v, role: "vc" });
          return f ? { startup: s, vc: v, ...f, status: "suggested" as IntroStatus } : null;
        })
        .filter((x): x is Intro => !!x)
        .sort((a, b) => b.score - a.score)
        .slice(0, perStartup),
    )
    .sort((a, b) => b.score - a.score);
}

/**
 * How well an event suits a person: is it open to one of their roles, does it cover their sector,
 * and who useful is already registered. Null = not for them.
 */
export function eventFit(p: Side, e: Pick<NexaEvent, "audience" | "sectors" | "country">, guests: Side[]): Fit | null {
  const fits = facets(p)
    .map((f) => eventFitOne(f, e, guests))
    .filter((f): f is Fit => !!f)
    .sort((a, b) => b.score - a.score);
  return fits[0] ?? null;
}

function eventFitOne(p: Side, e: Pick<NexaEvent, "audience" | "sectors" | "country">, guests: Side[]): Fit | null {
  if (!e.audience.includes(p.role)) return null;
  const reasons: string[] = [];
  let score = 15;
  const mine = p.role === "startup" ? (p.sector ? [p.sector] : []) : p.sectors ?? [];
  if (e.sectors === "any") {
    score += 15;
    reasons.push("Open to every sector");
  } else if (p.role === "talent" && !mine.length) {
    score += 15; // talent open to any sector fits any focus
  } else {
    const focus = e.sectors;
    const hit = mine.filter((s) => focus.includes(s));
    if (!hit.length) return null;
    score += 35;
    reasons.push(`Focus on ${hit.slice(0, 2).map(cap).join(" + ")}`);
  }
  if (e.country === p.country) {
    score += 10;
    reasons.push("In your country");
  }
  // Who useful is already registered, by role: "2 investors here fit you · 3 talent here fit you".
  let useful = 0;
  for (const r of ROLES) {
    const n = guests.filter((g) => hasRole(g, r) && onePair(p, { ...g, role: r, roles: [r] })).length;
    if (!n) continue;
    useful += n;
    reasons.push(`${n} ${n === 1 ? ROLE_PLURAL[r].replace(/s$/, "") : ROLE_PLURAL[r]} here fit you`);
  }
  score += Math.min(38, useful * 10);
  return { score: Math.min(98, score), reasons };
}

function cap(s: string) {
  return s === "ai" ? "AI" : s === "saas" ? "SaaS" : s.charAt(0).toUpperCase() + s.slice(1);
}
