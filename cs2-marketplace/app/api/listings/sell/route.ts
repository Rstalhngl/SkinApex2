import { NextResponse } from "next/server"
import { isSession, requireSession } from "@/lib/api-auth"
import { completePurchase } from "@/lib/purchase-service"
import { isValidTradeUrl } from "@/lib/trade-url"
import { updateUserData } from "@/lib/user-store"

export async function POST(req: Request) {
  const session = await requireSession()
  if (!isSession(session)) return session

  try {
    const body = await req.json()
    const { listingId, tradeUrl } = body as {
      listingId?: string
      tradeUrl?: string
    }

    const buyerTradeUrl = (tradeUrl ?? "").trim()
    if (!listingId || !buyerTradeUrl || !isValidTradeUrl(buyerTradeUrl)) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 })
    }

    await updateUserData(session.steamId, { tradeUrl: buyerTradeUrl })

    const result = await completePurchase(listingId, {
      steamId: session.steamId,
      steamName: session.steamName,
      tradeUrl: buyerTradeUrl,
    })

    if (!result.ok) {
      const status = result.error === "insufficient_balance" ? 402 : 400
      return NextResponse.json({ error: result.error }, { status })
    }

    return NextResponse.json({ sale: result.sale, listing: result.listing })
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
