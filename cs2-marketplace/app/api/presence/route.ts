import { NextResponse } from "next/server"
import { getSession, isSession } from "@/lib/api-auth"
import { touchPresence } from "@/lib/presence-store"

export async function POST() {
  const session = await getSession()
  if (!isSession(session)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  touchPresence(session.steamId)
  return NextResponse.json({ ok: true })
}
