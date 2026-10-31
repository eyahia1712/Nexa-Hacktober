import { NextResponse } from "next/server";
import { register } from "@/lib/events";

/** Register as a startup or a VC. Newcomers get a person key back to keep in the browser. */
export async function POST(req: Request, ctx: RouteContext<"/api/events/[id]/register">) {
  const { id } = await ctx.params;
  const res = register(id, await req.json().catch(() => null), req.headers.get("x-person-key"));
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res, { status: 201 });
}
