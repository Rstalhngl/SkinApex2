import { NextResponse } from "next/server"

export function GET(request: Request) {
  const reqUrl = new URL(request.url)

  // Client passes its own origin so we always get the correct public URL.
  // e.g. /api/auth/steam?origin=https://pod-xxx.cursorvm.com&_ingress_token=...
  const clientOrigin = reqUrl.searchParams.get("origin")
  const ingressToken = reqUrl.searchParams.get("_ingress_token")

  // Fallback chain if client didn't send origin
  let baseUrl = clientOrigin ?? process.env.NEXT_PUBLIC_BASE_URL ?? ""
  if (!baseUrl) {
    const fwdHost = request.headers.get("x-forwarded-host")?.split(",")[0].trim()
    const fwdProto = request.headers.get("x-forwarded-proto") ?? "https"
    if (fwdHost && !fwdHost.startsWith("localhost")) {
      baseUrl = `${fwdProto}://${fwdHost}`
    } else {
      baseUrl = new URL(request.url).origin
    }
  }
  baseUrl = baseUrl.replace(/\/$/, "")

  const callbackUrl = `${baseUrl}/api/auth/steam/callback`
  const returnTo = ingressToken
    ? `${callbackUrl}?_ingress_token=${encodeURIComponent(ingressToken)}`
    : callbackUrl

  // realm and return_to MUST share the same domain (Steam OpenID requirement).
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
