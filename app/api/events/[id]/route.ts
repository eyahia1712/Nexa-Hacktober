import { NextResponse } from "next/server";
import { getEvent } from "@/lib/events";

/** Public event details. x-host-key adds guests and intros; x-person-key adds your registration. */
export async function GET(req: Request, ctx: RouteContext<"/api/events/[id]">) {
  const { id } = await ctx.params;
  const res = getEvent(id, req.headers.get("x-host-key"), req.headers.get("x-person-key"));
  if (!res) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  return NextResponse.json(res);
}
