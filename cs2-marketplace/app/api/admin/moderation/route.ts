import { NextResponse } from "next/server"
import {
  banUserFromListing,
  getModerationBans,
  unbanUserFromListing,
} from "@/lib/admin-service"
import { requireAdmin } from "@/lib/admin-auth"

export async function GET() {
  const admin = await requireAdmin()
  if (admin instanceof Response) return admin

  const bans = await getModerationBans()
  return NextResponse.json({ bans })
}

export async function POST(req: Request) {
  const admin = await requireAdmin()
  if (admin instanceof Response) return admin

  try {
    const body = await req.json()
    const { steamId, action, days } = body as {
      steamId?: string
      action?: "ban" | "unban"
      days?: number
    }

    if (!steamId || !action) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 })
    }

    if (action === "ban") {
      await banUserFromListing(steamId, days ?? 7)
    } else {
      await unbanUserFromListing(steamId)
    }

    const bans = await getModerationBans()
    return NextResponse.json({ ok: true, bans })
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
