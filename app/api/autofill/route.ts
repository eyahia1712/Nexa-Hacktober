import { NextResponse } from "next/server";
import { autofill } from "@/lib/autofill";

export const maxDuration = 60;

/** A website link or a PDF (deck, CV, fund thesis) → Gemma picks the roles and drafts the profile. */
export async function POST(req: Request) {
  const res = await autofill(await req.json().catch(() => null));
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res);
}
