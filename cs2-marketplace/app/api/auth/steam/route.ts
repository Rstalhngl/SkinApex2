import { NextResponse } from "next/server"

const CALLBACK_URL = "https://skinapex.net/api/auth/steam/callback"
const REALM = "https://skinapex.net"

export function GET(request: Request) {
  const reqUrl = new URL(request.url)
  const ingressToken = reqUrl.searchParams.get("_ingress_token")

  const returnTo = ingressToken
    ? `${CALLBACK_URL}?_ingress_token=${encodeURIComponent(ingressToken)}`
    : CALLBACK_URL

  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo,
    "openid.realm": REALM,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  })

  return NextResponse.redirect(
    `https://steamcommunity.com/openid/login?${params.toString()}`,
  )
}
