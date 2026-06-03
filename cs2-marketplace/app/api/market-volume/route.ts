import { NextResponse } from "next/server"

// Server-side cache: refresh every 6 hours
let cached: { data: Record<string, number>; ts: number } | null = null
const CACHE_MS = 6 * 60 * 60 * 1000

/**
 * Returns a map of { market_hash_name → quantity } from Skinport.
 * Quantity = number of active listings on the market = a good proxy for demand/popularity.
 */
export async function GET() {
  if (cached && Date.now() - cached.ts < CACHE_MS) {
    return NextResponse.json({ data: cached.data, source: "cache", count: Object.keys(cached.data).length })
  }

  try {
    const res = await fetch("https://api.skinport.com/v1/items?app_id=730&currency=USD", {
      headers: { "Accept-Encoding": "br" },
      next: { revalidate: 21600 },
    })
    if (!res.ok) throw new Error(`Skinport ${res.status}`)

    const items: { market_hash_name: string; quantity: number }[] = await res.json()

    const data: Record<string, number> = {}
    for (const item of items) {
      if (item.market_hash_name && item.quantity > 0) {
        data[item.market_hash_name] = item.quantity
      }
    }

    cached = { data, ts: Date.now() }
    return NextResponse.json({ data, source: "live", count: Object.keys(data).length })
  } catch (err) {
    // Return empty on failure — cs2-api will fall back to seeded popularity
    return NextResponse.json({ data: {}, source: "fallback", error: String(err) })
  }
}
