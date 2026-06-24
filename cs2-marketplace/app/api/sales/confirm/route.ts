import { NextResponse } from "next/server"
import { isSession, requireSession } from "@/lib/api-auth"
import { confirmSaleReceived } from "@/lib/sale-lifecycle"
import { readSalesStore } from "@/lib/sales-store"

export async function POST(req: Request) {
  const session = await requireSession()
  if (!isSession(session)) return session

  try {
    const body = await req.json()
    const { saleId } = body as { saleId?: string }
    if (!saleId) return NextResponse.json({ error: "invalid_request" }, { status: 400 })

    const store = await readSalesStore()
    const existing = store.sales.find((s) => s.id === saleId && s.buyerId === session.steamId)
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 })
    if (existing.status === "pending_delivery" && !existing.deliveredAt) {
      return NextResponse.json({ error: "seller_not_delivered" }, { status: 400 })
    }

    const sale = await confirmSaleReceived(saleId, session.steamId)
    if (!sale) return NextResponse.json({ error: "not_found" }, { status: 404 })

    return NextResponse.json({ sale })
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
