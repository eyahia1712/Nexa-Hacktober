import { NextResponse } from "next/server";
import { cleanOpportunity, gemma, hasKey, parseJson, posterPrompt, type FilePart } from "@/lib/gemma";

export const maxDuration = 60;

/** A poster, screenshot or pasted post → a clean opportunity record. The gateway fills itself. */
export async function POST(req: Request) {
  const { text = "", files = [] } = (await req.json()) as { text?: string; files?: FilePart[] };

  if (!hasKey()) {
    return NextResponse.json({
      opp: cleanOpportunity({
        name: "AgriTech Challenge Vietnam",
        org: "Sample organiser",
        country: "VN",
        type: "accelerator",
        stages: ["pre-seed", "seed"],
        sectors: ["agritech", "foodtech"],
        openToAllAsean: true,
        offers: ["funding", "pilot-partner"],
        amount: "US$ 30k prize",
        deadline: "2026-12-14",
        url: null,
        summary: "Sample mode: add your API key to read real posters.",
      }),
      mode: "sample",
    });
  }
  if (!text.trim() && files.length === 0) {
    return NextResponse.json({ error: "Add a poster image or paste the post text." }, { status: 400 });
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const prompt = text.trim() ? `${posterPrompt(today)}\n\nPost text:\n${text.slice(0, 4000)}` : posterPrompt(today);
    const answer = await gemma(prompt, files.slice(0, 3));
    return NextResponse.json({ opp: cleanOpportunity(parseJson(answer)), mode: "gemma" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Gemma couldn't read that poster. Try a clearer image." }, { status: 502 });
  }
}
