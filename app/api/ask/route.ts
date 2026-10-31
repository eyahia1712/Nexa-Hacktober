import { NextResponse } from "next/server";
import { gemma, hasKey } from "@/lib/gemma";
import en from "@/messages/en.json";
import type { Match, Profile, Request as Need } from "@/lib/types";

export const maxDuration = 60;

/** Founder asks anything, in any ASEAN language. Gemma answers only from the matched list. */
export async function POST(req: Request) {
  const { question, profile, request, matches } = (await req.json()) as {
    question: string;
    profile: Profile;
    request?: Need;
    matches: Match[];
  };
  const dict = en as Record<string, string>;
  const reason = (r: Match["reasons"][number]) => (dict[r.key] ?? r.key).replace(/\{(\w+)\}/g, (_, k: string) => String(r.vars?.[k] ?? ""));

  if (!hasKey()) {
    return NextResponse.json({
      answer:
        `Sample mode (no API key): start with ${matches[0]?.opp.name ?? "your top match"}. It is your strongest fit right now. Add a Gemini API key for real answers.`,
      mode: "sample",
    });
  }

  const context = matches.slice(0, 12).map((m) => ({
    name: m.opp.name,
    org: m.opp.org,
    country: m.opp.country,
    type: m.opp.type,
    verdict: m.verdict,
    score: m.score,
    amount: m.opp.amount,
    deadline: m.opp.deadline,
    reasons: m.reasons.map(reason),
    summary: m.opp.summary,
  }));

  const prompt = `You are Nexa, a friendly guide to startup opportunities across the 11 ASEAN countries.
Answer the founder's question in the SAME LANGUAGE they wrote it in (Bahasa Malaysia, Bahasa Indonesia, Thai, Vietnamese, Tagalog, English, etc).
Rules:
- Only recommend opportunities from the list below. Never invent programmes, amounts or dates.
- Eligibility ("verdict") was decided by fixed rules. Respect it: never recommend a "no" as something they can apply to now.
- Name opportunities exactly. Mention deadlines when relevant.
- Max 120 words. Plain text, short paragraphs or a short list. No markdown headings.

Company profile: ${JSON.stringify({ ...profile, logo: undefined, banner: undefined })}
Looking for: ${JSON.stringify(request ?? {})}
Matched opportunities: ${JSON.stringify(context)}

Founder's question: ${String(question).slice(0, 800)}`;

  try {
    return NextResponse.json({ answer: await gemma(prompt), mode: "gemma" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Gemma is busy. Try again in a moment." }, { status: 502 });
  }
}
