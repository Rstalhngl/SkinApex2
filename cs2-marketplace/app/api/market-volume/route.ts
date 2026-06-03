import { NextResponse } from "next/server"

let cached: {
  volume: Record<string, number>
  prices: Record<string, number>
  ts: number
} | null = null

const CACHE_MS = 6 * 60 * 60 * 1000 // 6 hours

export async function GET() {
  if (cached && Date.now() - cached.ts < CACHE_MS) {
    return NextResponse.json({
      volume: cached.volume,
      prices: cached.prices,
      source: "cache",
      count: Object.keys(cached.volume).length,
    })
  }

  try {
    const res = await fetch("https://api.skinport.com/v1/items?app_id=730&currency=USD", {
      headers: { "Accept-Encoding": "br" },
      next: { revalidate: 21600 },
    })
    if (!res.ok) throw new Error(`Skinport ${res.status}`)

    const items: {
      market_hash_name: string
      quantity: number
      suggested_price: number | null
      median_price: number | null
      min_price: number | null
    }[] = await res.json()

    const volume: Record<string, number> = {}
    const prices: Record<string, number> = {}

    for (const item of items) {
      const name = item.market_hash_name
      if (!name) continue
      if (item.quantity > 0) volume[name] = item.quantity
      // Use suggested_price as the primary real-world price reference
      const price = item.suggested_price ?? item.median_price ?? item.min_price
      if (price && price > 0) prices[name] = price
    }

    cached = { volume, prices, ts: Date.now() }
    return NextResponse.json({
      volume,
      prices,
      source: "live",
      count: Object.keys(volume).length,
    })
  } catch (err) {
    return NextResponse.json({ volume: {}, prices: {}, source: "fallback", error: String(err) })
  }
}
