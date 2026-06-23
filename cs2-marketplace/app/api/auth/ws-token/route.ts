import { NextResponse } from "next/server"
import { getSession } from "@/lib/api-auth"
import { signWsToken } from "@/lib/ws-auth"

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    return NextResponse.json({ token: signWsToken(session.steamId) })
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 503 })
  }
}
