import { NextResponse } from "next/server"
import { isSession, requireSession } from "@/lib/api-auth"
import { getSalesForBuyer, getSalesForSeller } from "@/lib/sales-store"
import { processExpiredSales } from "@/lib/sale-lifecycle"

export async function GET() {
  const session = await requireSession()
  if (!isSession(session)) return session

  try {
    await processExpiredSales()
    const [salesAsSeller, salesAsBuyer] = await Promise.all([
      getSalesForSeller(session.steamId),
      getSalesForBuyer(session.steamId),
    ])
    return NextResponse.json({ salesAsSeller, salesAsBuyer, sales: salesAsSeller })
  } catch {
    return NextResponse.json({ salesAsSeller: [], salesAsBuyer: [], sales: [] })
  }
}
