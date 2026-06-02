import { NextResponse } from "next/server"

function getBaseUrl(request: Request): string {
  // 1. Explicit env override (production deployments)
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "")
  }

  // 2. Reverse-proxy headers (Cursor cloud, Vercel, nginx, etc.)
  const fwdHost = request.headers.get("x-forwarded-host")
  const fwdProto = request.headers.get("x-forwarded-proto") ?? "https"
  if (fwdHost && !fwdHost.startsWith("localhost")) {
    return `${fwdProto}://${fwdHost}`
  }

  // 3. Plain host header when not localhost
  const host = request.headers.get("host") ?? ""
  if (host && !host.startsWith("localhost") && !host.startsWith("127.")) {
    return `https://${host}`
  }

  // 4. Fallback – local dev
  return new URL(request.url).origin
}

export function GET(request: Request) {
  const baseUrl = getBaseUrl(request)

  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": `${baseUrl}/api/auth/steam/callback`,
    "openid.realm": baseUrl,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  })

  return NextResponse.redirect(
    `https://steamcommunity.com/openid/login?${params.toString()}`,
  )
}
