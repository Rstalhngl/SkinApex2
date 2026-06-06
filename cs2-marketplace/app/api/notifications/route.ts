import { NextResponse } from "next/server"
import {
  getNotificationsForUser,
  markNotificationsRead,
} from "@/lib/notifications-store"

export async function GET(req: Request) {
  const steamId = new URL(req.url).searchParams.get("steamId")
  if (!steamId) {
    return NextResponse.json({ error: "missing_steam_id" }, { status: 400 })
  }

  try {
    const notifications = await getNotificationsForUser(steamId)
    return NextResponse.json({ notifications })
  } catch {
    return NextResponse.json({ notifications: [] })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { steamId, ids } = body as { steamId?: string; ids?: string[] }
    if (!steamId) {
      return NextResponse.json({ error: "missing_steam_id" }, { status: 400 })
    }
    await markNotificationsRead(steamId, ids)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
