import { NextResponse } from "next/server"
import { getSession } from "@/lib/api-auth"

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ loggedIn: false })
  }
  return NextResponse.json({
    loggedIn: true,
    steamId: session.steamId,
    steamName: session.steamName,
    steamAvatar: session.steamAvatar,
  })
}
