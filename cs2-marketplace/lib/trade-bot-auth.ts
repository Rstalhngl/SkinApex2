import { NextResponse } from "next/server"
import { getTradeBotApiKey } from "@/lib/trade-bot-config"

export function verifyTradeBotRequest(req: Request): NextResponse | null {
  const expected = getTradeBotApiKey()
  if (!expected) {
    return NextResponse.json({ error: "trade_bot_not_configured" }, { status: 503 })
  }

  const header = req.headers.get("x-trade-bot-key")?.trim()
  const url = new URL(req.url)
  const query = url.searchParams.get("key")?.trim()

  if (header !== expected && query !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  return null
}
