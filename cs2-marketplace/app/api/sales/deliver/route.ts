import { NextResponse } from "next/server"
import { isSession, requireSession } from "@/lib/api-auth"
import { markSaleDelivered } from "@/lib/sale-lifecycle"

export async function POST(req: Request) {
  const session = await requireSession()
  if (!isSession(session)) return session

  try {
    const body = await req.json()
    const { saleId } = body as { saleId?: string }
    if (!saleId) return NextResponse.json({ error: "invalid_request" }, { status: 400 })

    const sale = await markSaleDelivered(saleId, session.steamId)
    if (!sale) return NextResponse.json({ error: "not_found" }, { status: 404 })

    return NextResponse.json({ sale })
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
