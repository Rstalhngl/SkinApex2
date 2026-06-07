import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const WINDOW_MS = 60_000
const MAX_WRITE_REQUESTS = 60

const hits = new Map<string, { count: number; resetAt: number }>()

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  )
}

function isRateLimited(ip: string): boolean {
  if (ip === "unknown") return false

  const now = Date.now()
  const entry = hits.get(ip)
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > MAX_WRITE_REQUESTS
}

function isExemptPath(pathname: string): boolean {
  if (pathname.startsWith("/api/auth/")) return true
  if (pathname.startsWith("/api/internal/")) return true
  if (pathname === "/api/inventory") return true
  return false
}

export function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  if (isExemptPath(req.nextUrl.pathname)) {
    return NextResponse.next()
  }

  // Polling and page loads use GET; only throttle mutating requests.
  const method = req.method.toUpperCase()
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
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
