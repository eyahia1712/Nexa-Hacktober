import { NextResponse } from "next/server";
import { createEvent, listEvents } from "@/lib/events";

/** All events. With x-person-key, each one says whether you're going. */
export async function GET(req: Request) {
  return NextResponse.json({ events: listEvents(req.headers.get("x-person-key")) });
}

/** Anyone can host. The host key that comes back is the only way to see the guest list. */
export async function POST(req: Request) {
  const res = createEvent(await req.json().catch(() => null));
  if ("error" in res) return NextResponse.json(res, { status: 400 });
  return NextResponse.json(res, { status: 201 });
}
