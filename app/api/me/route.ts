import { NextResponse } from "next/server";
import { me, savePerson } from "@/lib/people";

/** Your profile, your events and events picked for you. Needs x-person-key. */
export async function GET(req: Request) {
  const res = me(req.headers.get("x-person-key"));
  if (!res) return NextResponse.json({ error: "No profile on this device yet." }, { status: 404 });
  return NextResponse.json(res);
}

/** Create your profile (returns a new key) or update it (with x-person-key). */
export async function POST(req: Request) {
  const res = savePerson(await req.json().catch(() => null), req.headers.get("x-person-key"));
  if ("error" in res) return NextResponse.json(res, { status: 400 });
  return NextResponse.json(res);
}
