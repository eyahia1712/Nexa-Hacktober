import { NextResponse } from "next/server";
import { participants } from "@/lib/people";

/** Event dashboard: everyone else at the event, ranked by fit to you. Registered guests only. */
export async function GET(req: Request, ctx: RouteContext<"/api/events/[id]/participants">) {
  const { id } = await ctx.params;
  const res = participants(id, req.headers.get("x-person-key"));
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res);
}
