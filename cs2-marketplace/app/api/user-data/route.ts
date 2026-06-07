import { NextResponse } from "next/server"
import { isSession, requireSession } from "@/lib/api-auth"
import { getUserData, updateUserData } from "@/lib/user-store"
import { isValidTradeUrl } from "@/lib/trade-url"

export async function GET() {
  const session = await requireSession()
  if (!isSession(session)) return session

  const data = await getUserData(session.steamId)
  return NextResponse.json({ data })
}

export async function PATCH(req: Request) {
  const session = await requireSession()
  if (!isSession(session)) return session

  try {
    const body = await req.json()
    const { tradeUrl, cartListingIds, wishlistListingIds } = body as {
      tradeUrl?: string
      cartListingIds?: string[]
      wishlistListingIds?: string[]
    }

    const patch: Parameters<typeof updateUserData>[1] = {}

    if (tradeUrl !== undefined) {
      if (tradeUrl && !isValidTradeUrl(tradeUrl)) {
        return NextResponse.json({ error: "invalid_trade_url" }, { status: 400 })
      }
      patch.tradeUrl = tradeUrl.trim()
    }
    if (Array.isArray(cartListingIds)) {
      patch.cartListingIds = cartListingIds.filter((id) => typeof id === "string")
    }
    if (Array.isArray(wishlistListingIds)) {
      patch.wishlistListingIds = wishlistListingIds.filter((id) => typeof id === "string")
    }

    const data = await updateUserData(session.steamId, patch)
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
