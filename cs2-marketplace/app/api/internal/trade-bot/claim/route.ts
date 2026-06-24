import { NextResponse } from "next/server"
import { claimBotDelivery } from "@/lib/trade-delivery-service"
import { verifyTradeBotRequest } from "@/lib/trade-bot-auth"

export async function POST(req: Request) {
  const denied = verifyTradeBotRequest(req)
  if (denied) return denied

  try {
    const body = await req.json()
    const { saleId } = body as { saleId?: string }
    if (!saleId) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 })
    }

    const claimed = await claimBotDelivery(saleId)
    if (!claimed) {
      return NextResponse.json({ error: "claim_failed" }, { status: 409 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
