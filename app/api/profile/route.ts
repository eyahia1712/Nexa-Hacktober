import { NextResponse } from "next/server";

import { prepare, type Upload } from "@/lib/extract";
import { cleanProfile, cleanRequest, gemma, hasKey, parseJson, PROFILE_PROMPT, SAMPLE_PROFILE } from "@/lib/gemma";

export const maxDuration = 60;

/** Company deck / profile (PDF, PPTX, DOCX, image, text) → structured profile, read by Gemma 4. */
export async function POST(req: Request) {
  const { text = "", uploads = [] } = (await req.json()) as { text?: string; uploads?: Upload[] };

  if (!hasKey()) return NextResponse.json({ profile: SAMPLE_PROFILE, request: null, mode: "sample" });
  if (!text.trim() && uploads.length === 0) return NextResponse.json({ error: "empty" }, { status: 400 });

  try {
    const { files, text: extracted } = prepare(uploads);
    const body = [extracted, text.trim() && `Founder's description:\n${text.slice(0, 4000)}`].filter(Boolean).join("\n\n");
    const answer = await gemma(body ? `${PROFILE_PROMPT}\n\n${body}` : PROFILE_PROMPT, files);
    const raw = parseJson<Record<string, unknown>>(answer);
    const profile = cleanProfile(raw);
    const hasNeeds = Array.isArray(raw.needs) && raw.needs.length > 0;
    return NextResponse.json({ profile, request: hasNeeds ? cleanRequest(raw, profile.country) : null, mode: "gemma" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "unreadable" }, { status: 502 });
  }
}
