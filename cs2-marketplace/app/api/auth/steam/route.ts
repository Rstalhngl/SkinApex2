import { NextResponse } from "next/server"

function getBaseUrl(request: Request): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "")
  }
  const fwdHost = request.headers.get("x-forwarded-host")
  const fwdProto = request.headers.get("x-forwarded-proto") ?? "https"
  if (fwdHost && !fwdHost.startsWith("localhost")) {
    return `${fwdProto}://${fwdHost}`
  }
  const host = request.headers.get("host") ?? ""
  if (host && !host.startsWith("localhost") && !host.startsWith("127.")) {
    return `https://${host}`
  }
  return new URL(request.url).origin
}

export function GET(request: Request) {
  const baseUrl = getBaseUrl(request)
  const reqUrl = new URL(request.url)

  // Use short /auth/steam/callback path when base URL is explicitly set,
  // otherwise fall back to /api/auth/steam/callback
  const callbackPath = process.env.NEXT_PUBLIC_BASE_URL
    ? "/auth/steam/callback"
    : "/api/auth/steam/callback"

  // Preserve routing tokens (e.g. Cursor cloud _ingress_token) in callback URL
  const ingressToken = reqUrl.searchParams.get("_ingress_token")
  const callbackBase = `${baseUrl}${callbackPath}`
  const returnTo = ingressToken
    ? `${callbackBase}?_ingress_token=${encodeURIComponent(ingressToken)}`
    : callbackBase

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
