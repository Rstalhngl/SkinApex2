import { NextResponse } from "next/server"
import { confirmListingDeposit } from "@/lib/deposit-service"
import { verifyTradeBotRequest } from "@/lib/trade-bot-auth"

export async function POST(req: Request) {
  const denied = verifyTradeBotRequest(req)
  if (denied) return denied

  try {
    const body = await req.json()
    const { sellerId, botAssetId, sellerAssetId } = body as {
      sellerId?: string
      botAssetId?: string
      sellerAssetId?: string
    }

    if (!sellerId || !botAssetId) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 })
    }

    const listing = await confirmListingDeposit(sellerId, botAssetId, sellerAssetId)
    if (!listing) {
      return NextResponse.json({ error: "listing_not_found" }, { status: 404 })
    }

    return NextResponse.json({ ok: true, listing })
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
