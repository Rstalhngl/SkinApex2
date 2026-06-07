import { NextResponse } from "next/server"
import { isAllowedAuthOrigin } from "@/lib/app-config"

function resolveBaseUrl(request: Request): string | null {
  const reqUrl = new URL(request.url)
  const clientOrigin = reqUrl.searchParams.get("origin")?.trim()

  if (clientOrigin) {
    const normalized = clientOrigin.replace(/\/$/, "")
    return isAllowedAuthOrigin(normalized) ? normalized : null
  }

  const envBase = process.env.NEXT_PUBLIC_BASE_URL?.trim().replace(/\/$/, "")
  if (envBase && isAllowedAuthOrigin(envBase)) return envBase

  if (process.env.NODE_ENV !== "production") {
    const fwdHost = request.headers.get("x-forwarded-host")?.split(",")[0].trim()
    const fwdProto = request.headers.get("x-forwarded-proto") ?? "http"
    if (fwdHost) return `${fwdProto}://${fwdHost}`.replace(/\/$/, "")
    return new URL(request.url).origin
  }

  return null
}

export function GET(request: Request) {
  const reqUrl = new URL(request.url)
  const ingressToken = reqUrl.searchParams.get("_ingress_token")
  const baseUrl = resolveBaseUrl(request)

  if (!baseUrl) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 400 })
  }

  const originParam = encodeURIComponent(baseUrl)
  const callbackUrl = `${baseUrl}/api/auth/steam/callback?origin=${originParam}`
  const returnTo = ingressToken
    ? `${callbackUrl}&_ingress_token=${encodeURIComponent(ingressToken)}`
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
