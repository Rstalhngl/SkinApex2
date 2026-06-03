import { NextRequest, NextResponse } from "next/server"

const STEAM_OPENID = "https://steamcommunity.com/openid/login"
const STEAM_ID_REGEX = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/

const HOME_URL = "https://skinapex.net"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const ingressToken = searchParams.get("_ingress_token")
  const params = Object.fromEntries(searchParams.entries())

  // Verify OpenID assertion with Steam
  const verifyParams = new URLSearchParams({ ...params, "openid.mode": "check_authentication" })
  let isValid = false
  try {
    const res = await fetch(STEAM_OPENID, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: verifyParams.toString(),
    })
    isValid = (await res.text()).includes("is_valid:true")
  } catch { /* network error */ }

  const buildHomeUrl = (extra?: Record<string, string>) => {
    const u = new URL(HOME_URL)
    if (ingressToken) u.searchParams.set("_ingress_token", ingressToken)
    if (extra) Object.entries(extra).forEach(([k, v]) => u.searchParams.set(k, v))
    return u.toString()
  }

  if (!isValid) return NextResponse.redirect(buildHomeUrl({ authError: "1" }))

  const claimedId = params["openid.claimed_id"] ?? ""
  const match = claimedId.match(STEAM_ID_REGEX)
  if (!match) return NextResponse.redirect(buildHomeUrl({ authError: "1" }))

  const steamId = match[1]
  let steamName: string | null = null
  let steamAvatar: string | null = null

  const apiKey = process.env.STEAM_API_KEY
  if (apiKey) {
    try {
      const res = await fetch(
        `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`,
      )
      const data = await res.json()
      const player = data?.response?.players?.[0]
      if (player) {
        steamName = player.personaname ?? null
        steamAvatar = player.avatarmedium ?? null
      }
    } catch { /* profile info optional */ }
  }

  const extra: Record<string, string> = { steamId }
  if (steamName) extra.steamName = steamName
  if (steamAvatar) extra.steamAvatar = steamAvatar

  return NextResponse.redirect(buildHomeUrl(extra))
}
