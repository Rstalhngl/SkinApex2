import { NextRequest, NextResponse } from "next/server"
import * as xmljs from "xml2js" // may not be available, we'll parse manually

const STEAM_OPENID = "https://steamcommunity.com/openid/login"
const STEAM_ID_REGEX = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/

function getBaseUrl(request: NextRequest): string {
  const clientOrigin = request.nextUrl.searchParams.get("origin")
  if (clientOrigin) return clientOrigin.replace(/\/$/, "")
  if (process.env.NEXT_PUBLIC_BASE_URL)
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "")
  const fwdHost = request.headers.get("x-forwarded-host")?.split(",")[0].trim()
  const fwdProto = request.headers.get("x-forwarded-proto") ?? "https"
  if (fwdHost && !fwdHost.startsWith("localhost"))
    return `${fwdProto}://${fwdHost}`
  return new URL(request.url).origin
}

/** Fetch Steam profile info using the public XML endpoint (no API key needed) */
async function fetchSteamProfile(steamId: string): Promise<{ name: string | null; avatar: string | null }> {
  // First try Steam Web API if key is set
  const apiKey = process.env.STEAM_API_KEY
  if (apiKey) {
    try {
      const res = await fetch(
        `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`,
      )
      const data = await res.json()
      const player = data?.response?.players?.[0]
      if (player) return { name: player.personaname ?? null, avatar: player.avatarmedium ?? null }
    } catch {}
  }

  // Fallback: Steam Community XML profile (no API key needed)
  try {
    const res = await fetch(`https://steamcommunity.com/profiles/${steamId}/?xml=1`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    })
    const xml = await res.text()

    // Simple regex parse — avoids needing xml2js
    const name = xml.match(/<steamID><!\[CDATA\[([^\]]+)\]\]><\/steamID>/)?.[1]
      || xml.match(/<steamID>([^<]+)<\/steamID>/)?.[1]
      || null
    const avatar = xml.match(/<avatarMedium><!\[CDATA\[([^\]]+)\]\]><\/avatarMedium>/)?.[1]
      || xml.match(/<avatarMedium>([^<]+)<\/avatarMedium>/)?.[1]
      || null

    return { name, avatar }
  } catch {}

  return { name: null, avatar: null }
}

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request)
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
  } catch {}

  const buildHomeUrl = (extra?: Record<string, string>) => {
    const u = new URL(baseUrl)
    if (ingressToken) u.searchParams.set("_ingress_token", ingressToken)
    if (extra) Object.entries(extra).forEach(([k, v]) => u.searchParams.set(k, v))
    return u.toString()
  }

  if (!isValid) return NextResponse.redirect(buildHomeUrl({ authError: "1" }))

  const claimedId = params["openid.claimed_id"] ?? ""
  const match = claimedId.match(STEAM_ID_REGEX)
  if (!match) return NextResponse.redirect(buildHomeUrl({ authError: "1" }))

  const steamId = match[1]
  const { name: steamName, avatar: steamAvatar } = await fetchSteamProfile(steamId)

  const extra: Record<string, string> = { steamId }
  if (steamName) extra.steamName = steamName
  if (steamAvatar) extra.steamAvatar = steamAvatar

  return NextResponse.redirect(buildHomeUrl(extra))
}
