import { NextResponse } from "next/server"
import { getSession } from "@/lib/api-auth"
import { isAdminSteamId } from "@/lib/admin-auth"

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ isAdmin: false, loggedIn: false })
  }
  return NextResponse.json({
    loggedIn: true,
    isAdmin: isAdminSteamId(session.steamId),
    steamId: session.steamId,
    steamName: session.steamName,
  })
}
