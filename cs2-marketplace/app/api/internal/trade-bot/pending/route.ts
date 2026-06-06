import { NextResponse } from "next/server"
import { verifyTradeBotRequest } from "@/lib/trade-bot-auth"
import { getPendingBotDeliveries, getTrackedBotOffers } from "@/lib/trade-delivery-service"

export async function GET(req: Request) {
  const denied = verifyTradeBotRequest(req)
  if (denied) return denied

  try {
    const [pending, tracked] = await Promise.all([
      getPendingBotDeliveries(),
      getTrackedBotOffers(),
    ])
    return NextResponse.json({ pending, tracked })
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
