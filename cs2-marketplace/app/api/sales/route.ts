import { NextResponse } from "next/server"
import { getSalesForSeller } from "@/lib/sales-store"

export async function GET(req: Request) {
  const sellerId = new URL(req.url).searchParams.get("sellerId")
  if (!sellerId) {
    return NextResponse.json({ error: "missing_seller_id" }, { status: 400 })
  }

  try {
    const sales = await getSalesForSeller(sellerId)
    return NextResponse.json({ sales })
  } catch {
    return NextResponse.json({ sales: [] })
  }
}
