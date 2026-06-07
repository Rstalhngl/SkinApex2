import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const WINDOW_MS = 60_000
const MAX_REQUESTS = 120

const hits = new Map<string, { count: number; resetAt: number }>()

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  )
}

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = hits.get(ip)
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > MAX_REQUESTS
}

export function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  // User-initiated Steam inventory pulls; avoid false 429 during retries.
  if (req.nextUrl.pathname === "/api/inventory") {
    return NextResponse.next()
  }

  if (isRateLimited(clientIp(req))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: "/api/:path*",
}
