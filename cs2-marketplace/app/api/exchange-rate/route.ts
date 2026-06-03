import { NextResponse } from "next/server"

// Server-side cache: refresh at most once per hour
let cached: { rate: number; ts: number } | null = null
const CACHE_MS = 60 * 60 * 1000 // 1 hour
const FALLBACK_RATE = 45.96

export async function GET() {
  if (cached && Date.now() - cached.ts < CACHE_MS) {
    return NextResponse.json({ rate: cached.rate, source: "cache" })
  }

  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=TRY", {
      next: { revalidate: 3600 },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const rate = data?.rates?.TRY
    if (!rate || typeof rate !== "number") throw new Error("invalid rate")
    cached = { rate, ts: Date.now() }
    return NextResponse.json({ rate, source: "live" })
  } catch {
    // If fetch fails, return fallback
    return NextResponse.json({ rate: FALLBACK_RATE, source: "fallback" })
  }
}
