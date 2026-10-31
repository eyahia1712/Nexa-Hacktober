import { NextResponse } from "next/server";
import { invite } from "@/lib/events";

/** Host only: invite a person ({ personId }). They get a notification. */
export async function POST(req: Request, ctx: RouteContext<"/api/events/[id]/invite">) {
  const { id } = await ctx.params;
  const res = invite(id, req.headers.get("x-host-key"), await req.json().catch(() => null));
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res);
}
