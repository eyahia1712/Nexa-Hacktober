import { COUNTRIES, NEED_LABEL, SECTOR_LABEL, STAGE_LABEL, type Match, type Opportunity, type Profile, type Reason, type Request } from "./types";

const DAY = 86_400_000;

/** Days from today to the deadline. Negative means it has closed. */
export function daysLeft(deadline: string, today = new Date()): number | null {
  if (deadline === "rolling") return null;
  const end = new Date(deadline + "T23:59:59");
  const start = new Date(today.toISOString().slice(0, 10) + "T00:00:00");
  return Math.floor((end.getTime() - start.getTime()) / DAY);
}

/**
 * Plain rules decide eligibility and fit. The AI never decides a match:
 * it reads documents and explains results, so every score can be traced.
 */
export function matchOne(p: Profile, r: Request, opp: Opportunity, today = new Date()): Match {
  const reasons: Reason[] = [];
  const left = daysLeft(opp.deadline, today);
  let blocked = false;

  if (left !== null && left < 0) {
    blocked = true;
    reasons.push({ tone: "bad", key: "r.closed", vars: { n: -left } });
  }
  if (!opp.stages.includes(p.stage)) {
    blocked = true;
    reasons.push({ tone: "bad", key: "r.stage", vars: { stages: opp.stages.map((s) => STAGE_LABEL[s]).join(" / "), stage: STAGE_LABEL[p.stage] } });
  }
  if (opp.openTo !== "ASEAN" && !opp.openTo.includes(p.country)) {
    blocked = true;
    reasons.push({ tone: "bad", key: "r.only", vars: { list: opp.openTo.map((c) => COUNTRIES[c].name).join(", ") } });
  }

  let score = 15;
  const sectorHit = opp.sectors === "any" ? null : p.sectors.find((s) => (opp.sectors as string[]).includes(s));
  if (opp.sectors === "any") {
    score += 20;
    reasons.push({ tone: "good", key: "r.anySector" });
  } else if (sectorHit) {
    score += 35;
    reasons.push({ tone: "good", key: "r.sector", vars: { sector: SECTOR_LABEL[sectorHit] } });
  } else {
    reasons.push({ tone: "warn", key: "r.noSector" });
  }

  const hits = opp.offers.filter((o) => r.needs.includes(o));
  if (hits.length) {
    score += Math.min(36, hits.length * 18);
    reasons.push({ tone: "good", key: "r.offers", vars: { list: hits.map((h) => NEED_LABEL[h].toLowerCase()).join(" + ") } });
  } else {
    reasons.push({ tone: "warn", key: "r.noOffers" });
  }

  if (r.targetMarkets.includes(opp.country)) {
    score += 20;
    reasons.push({ tone: "good", key: "r.target", vars: { country: COUNTRIES[opp.country].name } });
  } else if (opp.country === p.country) {
    score += 8;
    reasons.push({ tone: "good", key: "r.home" });
  }

  if (left !== null && left >= 0 && left <= 21) {
    reasons.push({ tone: "warn", key: "r.soon", vars: { n: left } });
  }

  score = Math.min(98, score);
  const verdict = blocked ? "no" : score >= 65 ? "strong" : "partial";
  return { opp, score: blocked ? 0 : score, verdict, reasons, daysLeft: left };
}

export function matchAll(p: Profile, r: Request, opps: Opportunity[], today = new Date()): Match[] {
  const order = { strong: 0, partial: 1, no: 2 };
  const self = p.name.toLowerCase().replace(/\s/g, "");
  return opps
    .filter((o) => !o.org.toLowerCase().replace(/\s/g, "").includes(self))
    .map((o) => matchOne(p, r, o, today))
    .sort((a, b) => order[a.verdict] - order[b.verdict] || b.score - a.score);
}
