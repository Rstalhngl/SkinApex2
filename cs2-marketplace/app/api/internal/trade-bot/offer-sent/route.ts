import { NextResponse } from "next/server"
import { verifyTradeBotRequest } from "@/lib/trade-bot-auth"
import { recordOfferSent } from "@/lib/trade-delivery-service"

export async function POST(req: Request) {
  const denied = verifyTradeBotRequest(req)
  if (denied) return denied

  try {
    const body = await req.json()
    const { saleId, steamOfferId } = body as { saleId?: string; steamOfferId?: string }

    if (!saleId || !steamOfferId) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 })
    }

    const sale = await recordOfferSent(saleId, String(steamOfferId))
    if (!sale) return NextResponse.json({ error: "not_found" }, { status: 404 })

    return NextResponse.json({ sale })
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
