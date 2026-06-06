import { NextResponse } from "next/server"
import { isSession, requireSession } from "@/lib/api-auth"
import {
  getNotificationsForUser,
  markNotificationsRead,
} from "@/lib/notifications-store"

export async function GET() {
  const session = await requireSession()
  if (!isSession(session)) return session

  try {
    const notifications = await getNotificationsForUser(session.steamId)
    return NextResponse.json({ notifications })
  } catch {
    return NextResponse.json({ notifications: [] })
  }
}

export async function PATCH(req: Request) {
  const session = await requireSession()
  if (!isSession(session)) return session

  try {
    const body = await req.json()
    const { ids } = body as { ids?: string[] }
    await markNotificationsRead(session.steamId, ids)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
