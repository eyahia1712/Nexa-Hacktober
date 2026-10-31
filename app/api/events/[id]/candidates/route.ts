import { NextResponse } from "next/server";
import { candidates } from "@/lib/events";

/** Host only: people on Nexa who aren't registered yet, ranked by fit to this event. */
export async function GET(req: Request, ctx: RouteContext<"/api/events/[id]/candidates">) {
  const { id } = await ctx.params;
  const res = candidates(id, req.headers.get("x-host-key"));
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json({ candidates: res });
}
