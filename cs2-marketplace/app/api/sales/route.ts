import { NextResponse } from "next/server"
import { getSalesForBuyer, getSalesForSeller } from "@/lib/sales-store"

export async function GET(req: Request) {
  const steamId = new URL(req.url).searchParams.get("steamId")
    ?? new URL(req.url).searchParams.get("sellerId")
  if (!steamId) {
    return NextResponse.json({ error: "missing_steam_id" }, { status: 400 })
  }

  try {
    const [salesAsSeller, salesAsBuyer] = await Promise.all([
      getSalesForSeller(steamId),
      getSalesForBuyer(steamId),
    ])
    return NextResponse.json({ salesAsSeller, salesAsBuyer, sales: salesAsSeller })
  } catch {
    return NextResponse.json({ salesAsSeller: [], salesAsBuyer: [], sales: [] })
  }
}
