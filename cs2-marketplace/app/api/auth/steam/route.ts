import { NextResponse } from "next/server"

function getBaseUrl(request: Request): string {
  // 1. Explicit production override via env var
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "")
  }
  // 2. Reverse-proxy / cloud forwarded headers (Cursor, Vercel, nginx…)
  const fwdHost = request.headers.get("x-forwarded-host")
  const fwdProto = request.headers.get("x-forwarded-proto") ?? "https"
  if (fwdHost) {
    // Use the first host if comma-separated list
    const host = fwdHost.split(",")[0].trim()
    return `${fwdProto}://${host}`
  }
  // 3. Host header fallback
  const host = request.headers.get("host") ?? ""
  if (host && !host.startsWith("localhost") && !host.startsWith("127.")) {
    return `https://${host}`
  }
  // 4. Local dev fallback
  return new URL(request.url).origin
}

export function GET(request: Request) {
  const baseUrl = getBaseUrl(request)
  const reqUrl = new URL(request.url)
  const ingressToken = reqUrl.searchParams.get("_ingress_token")

  const callbackUrl = `${baseUrl}/api/auth/steam/callback`
  const returnTo = ingressToken
    ? `${callbackUrl}?_ingress_token=${encodeURIComponent(ingressToken)}`
    : callbackUrl

  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo,
    "openid.realm": baseUrl,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  })

  return NextResponse.redirect(
    `https://steamcommunity.com/openid/login?${params.toString()}`,
  )
}
