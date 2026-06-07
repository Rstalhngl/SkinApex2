import { NextResponse } from "next/server"
import { isSession } from "@/lib/api-auth"
import { requireAdmin } from "@/lib/admin-auth"
import { resolveDispute, type ResolveAction } from "@/lib/admin-service"

export async function POST(req: Request) {
  const session = await requireAdmin()
  if (!isSession(session)) return session

  try {
    const body = await req.json()
    const { saleId, action, note } = body as {
      saleId?: string
      action?: ResolveAction
      note?: string
    }

    if (!saleId || (action !== "buyer_refund" && action !== "seller_paid")) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 })
    }

    const sale = await resolveDispute(saleId, action, session.steamId, note)
    if (!sale) {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }

    return NextResponse.json({ sale })
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
