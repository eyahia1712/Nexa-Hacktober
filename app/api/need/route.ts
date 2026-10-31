import { NextResponse } from "next/server";

import { prepare, type Upload } from "@/lib/extract";
import { cleanRequest, gemma, hasKey, parseJson, REQUEST_PROMPT } from "@/lib/gemma";
import type { Profile } from "@/lib/types";

export const maxDuration = 60;

/** A pitch or note → what the company is looking for (needs, markets, ask). */
export async function POST(req: Request) {
  const { text = "", uploads = [], profile } = (await req.json()) as { text?: string; uploads?: Upload[]; profile?: Profile };

  if (!hasKey()) {
    return NextResponse.json({ request: { needs: ["funding", "pilot-partner"], targetMarkets: ["SG", "VN"], ask: "US$150k", notes: "Sample mode: add a Gemini API key to read real pitches." }, mode: "sample" });
  }
  try {
    const { files, text: extracted } = prepare(uploads);
    const context = profile ? `Company: ${profile.name}, based in ${profile.country}. ${profile.oneLiner}` : "";
    const answer = await gemma([REQUEST_PROMPT, context, extracted, text.slice(0, 4000)].filter(Boolean).join("\n\n"), files);
    return NextResponse.json({ request: cleanRequest(parseJson(answer), profile?.country), mode: "gemma" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "unreadable" }, { status: 502 });
  }
}
