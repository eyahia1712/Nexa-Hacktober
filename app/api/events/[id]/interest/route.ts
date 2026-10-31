import { NextResponse } from "next/server";
import { sendInterest } from "@/lib/people";

/** "Interested" in another guest: { toId }. Notifies them; both sides = a match. */
export async function POST(req: Request, ctx: RouteContext<"/api/events/[id]/interest">) {
  const { id } = await ctx.params;
  const res = sendInterest(id, req.headers.get("x-person-key"), await req.json().catch(() => null));
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res);
}
