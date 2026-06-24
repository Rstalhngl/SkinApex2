import { NextResponse } from "next/server"
import type { TradeOfferState } from "@/lib/sale-types"
import { verifyTradeBotRequest } from "@/lib/trade-bot-auth"
import { updateTradeOfferState } from "@/lib/trade-delivery-service"

const VALID_STATES: TradeOfferState[] = [
  "queued",
  "sending",
  "sent",
  "active",
  "accepted",
  "declined",
  "canceled",
  "expired",
  "failed",
]

export async function POST(req: Request) {
  const denied = verifyTradeBotRequest(req)
  if (denied) return denied

  try {
    const body = await req.json()
    const { saleId, tradeOfferState, steamOfferId, error } = body as {
      saleId?: string
      tradeOfferState?: TradeOfferState
      steamOfferId?: string
      error?: string
    }

    if (!saleId || !tradeOfferState || !VALID_STATES.includes(tradeOfferState)) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 })
    }

    const sale = await updateTradeOfferState(saleId, tradeOfferState, {
      steamOfferId: steamOfferId ? String(steamOfferId) : undefined,
      error,
    })
    if (!sale) return NextResponse.json({ error: "not_found" }, { status: 404 })

    return NextResponse.json({ sale })
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
