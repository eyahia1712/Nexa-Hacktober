import { NextResponse } from "next/server";

import { cleanPathway, gemma, hasKey, LANGUAGE_NAME, parseJson, pathwayPrompt, rulesPathway } from "@/lib/gemma";
import type { Match, Profile, Request as Need } from "@/lib/types";

export const maxDuration = 60;

/** Step-by-step route to one opportunity, written by Gemma 4 in the user's language. */
export async function POST(req: Request) {
  const { profile, request, match, lang = "en" } = (await req.json()) as { profile: Profile; request: Need; match: Match; lang?: string };
  if (!hasKey()) return NextResponse.json(rulesPathway(profile, match));
  try {
    const answer = await gemma(pathwayPrompt(profile, request, match, LANGUAGE_NAME[lang] ?? "English", new Date().toISOString().slice(0, 10)));
    return NextResponse.json(cleanPathway(parseJson(answer)));
  } catch (e) {
    console.error(e);
    return NextResponse.json(rulesPathway(profile, match));
  }
}
