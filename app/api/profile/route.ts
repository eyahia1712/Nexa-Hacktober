import { NextResponse } from "next/server";
import { cleanProfile, gemma, hasKey, parseJson, PROFILE_PROMPT, SAMPLE_PROFILE, type FilePart } from "@/lib/gemma";

export const maxDuration = 60;

/** Pitch deck (PDF / images) or plain text → structured startup profile, read by Gemma 4. */
export async function POST(req: Request) {
  const { text = "", files = [] } = (await req.json()) as { text?: string; files?: FilePart[] };

  if (!hasKey()) return NextResponse.json({ profile: SAMPLE_PROFILE, mode: "sample" });
  if (!text.trim() && files.length === 0) {
    return NextResponse.json({ error: "Upload a deck or describe your startup." }, { status: 400 });
  }

  try {
    const prompt = text.trim() ? `${PROFILE_PROMPT}\n\nFounder's description:\n${text.slice(0, 4000)}` : PROFILE_PROMPT;
    const answer = await gemma(prompt, files.slice(0, 6));
    return NextResponse.json({ profile: cleanProfile(parseJson(answer)), mode: "gemma" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Gemma couldn't read that. Try again, or describe your startup in text." }, { status: 502 });
  }
}
