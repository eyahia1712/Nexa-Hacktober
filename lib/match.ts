import {
  COUNTRIES,
  NEED_LABEL,
  STAGE_LABEL,
  type Match,
  type Opportunity,
  type Profile,
  type Reason,
} from "./types";

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
 * it only reads the deck and explains the result, so every score can be traced.
 */
export function matchOne(p: Profile, opp: Opportunity, today = new Date()): Match {
  const reasons: Reason[] = [];
  const left = daysLeft(opp.deadline, today);
  let blocked = false;

  // Hard rules
  if (left !== null && left < 0) {
    blocked = true;
    reasons.push({ tone: "bad", text: `Closed ${-left} day${left === -1 ? "" : "s"} ago` });
  }
  if (!opp.stages.includes(p.stage)) {
    blocked = true;
    reasons.push({
      tone: "bad",
      text: `Takes ${opp.stages.map((s) => STAGE_LABEL[s]).join(" / ")}. You're ${STAGE_LABEL[p.stage]}`,
    });
  }
  if (opp.openTo !== "ASEAN" && !opp.openTo.includes(p.country)) {
    blocked = true;
    reasons.push({
      tone: "bad",
      text: `Only for founders based in ${opp.openTo.map((c) => COUNTRIES[c].name).join(", ")}`,
    });
  }

  // Fit score
  let score = 15;
  if (opp.sectors === "any") {
    score += 20;
    reasons.push({ tone: "good", text: "Open to every sector" });
  } else if (opp.sectors.includes(p.sector)) {
    score += 35;
    reasons.push({ tone: "good", text: `${cap(p.sector)} is a focus sector` });
  } else {
    reasons.push({ tone: "warn", text: `${cap(p.sector)} isn't a usual focus` });
  }

  const hits = opp.offers.filter((o) => p.needs.includes(o));
  if (hits.length) {
    score += Math.min(36, hits.length * 18);
    reasons.push({ tone: "good", text: `Offers ${hits.map((h) => NEED_LABEL[h].toLowerCase()).join(" + ")}, which you need` });
  } else {
    reasons.push({ tone: "warn", text: "Doesn't offer what you listed as needs" });
  }

  if (p.targetMarkets.includes(opp.country)) {
    score += 20;
    reasons.push({ tone: "good", text: `Based in ${COUNTRIES[opp.country].name}, a market you're targeting` });
  } else if (opp.country === p.country) {
    score += 8;
    reasons.push({ tone: "good", text: "In your home country" });
  }

  if (left !== null && left >= 0 && left <= 21) {
    reasons.push({ tone: "warn", text: `Closes in ${left} day${left === 1 ? "" : "s"}. Apply soon` });
  }

  score = Math.min(98, score);
  const verdict = blocked ? "no" : score >= 65 ? "strong" : "partial";
  return { opp, score: blocked ? 0 : score, verdict, reasons, daysLeft: left };
}

export function matchAll(p: Profile, opps: Opportunity[], today = new Date()): Match[] {
  const order = { strong: 0, partial: 1, no: 2 };
  return opps
    .map((o) => matchOne(p, o, today))
    .sort((a, b) => order[a.verdict] - order[b.verdict] || b.score - a.score);
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
