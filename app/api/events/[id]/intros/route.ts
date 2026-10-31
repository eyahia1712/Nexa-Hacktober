import { NextResponse } from "next/server";
import { setIntroStatus } from "@/lib/events";

/** Host moves a startup ↔ VC intro along: suggested → sent → meeting → deal. */
export async function PATCH(req: Request, ctx: RouteContext<"/api/events/[id]/intros">) {
  const { id } = await ctx.params;
  const res = setIntroStatus(id, req.headers.get("x-host-key"), await req.json().catch(() => null));
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res);
}
