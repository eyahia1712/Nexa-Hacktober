import { NextResponse } from "next/server";
import { markAllRead, notifications } from "@/lib/people";

export async function GET(req: Request) {
  const res = notifications(req.headers.get("x-person-key"));
  if (!res) return NextResponse.json({ items: [], unread: 0 });
  return NextResponse.json(res);
}

/** Mark everything read. */
export async function POST(req: Request) {
  markAllRead(req.headers.get("x-person-key"));
  return NextResponse.json({ ok: true });
}
