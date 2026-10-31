import { NextResponse } from "next/server";
import { gemma, hasKey } from "@/lib/gemma";
import type { Opportunity, Profile } from "@/lib/types";

export const maxDuration = 60;

/** One-click intro email to the programme, investor or partner. */
export async function POST(req: Request) {
  const { profile, opp } = (await req.json()) as { profile: Profile; opp: Opportunity };

  if (!hasKey()) {
    return NextResponse.json({
      draft: `Subject: ${profile.name} × ${opp.name}\n\nHi ${opp.org} team,\n\nI'm the founder of ${profile.name}. ${profile.oneLiner}\n\nWe're at ${profile.stage} with ${profile.traction ?? "early traction"}, and ${opp.name} fits what we need next. Could we book 20 minutes to see if we're a fit?\n\nBest,\nFounder, ${profile.name}\n\n(Sample mode: add your Gemini API key for a tailored draft.)`,
      mode: "sample",
    });
  }

  const prompt = `Write a short, warm, specific intro email from a startup founder to this opportunity.
Startup: ${JSON.stringify(profile)}
Opportunity: ${JSON.stringify({ name: opp.name, org: opp.org, type: opp.type, offers: opp.offers, summary: opp.summary })}
Rules: Start with "Subject: ...". Max 130 words in the body. Explain in one sentence why this startup fits THIS opportunity.
End with one clear ask (a 20-minute call, or the next application step). No placeholders like [Name], sign off as "Founder, ${profile.name}". Plain text only.`;

  try {
    return NextResponse.json({ draft: await gemma(prompt), mode: "gemma" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Gemma is busy. Try again in a moment." }, { status: 502 });
  }
}
