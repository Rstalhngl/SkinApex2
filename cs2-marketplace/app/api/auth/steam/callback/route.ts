import { NextRequest, NextResponse } from "next/server"
import { isAllowedAuthOrigin } from "@/lib/app-config"
import { sessionCookieOptions, signSession, SESSION_COOKIE } from "@/lib/session"

const STEAM_OPENID = "https://steamcommunity.com/openid/login"
const STEAM_ID_REGEX = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/

function getBaseUrl(request: NextRequest): string | null {
  const clientOrigin = request.nextUrl.searchParams.get("origin")
  if (clientOrigin) {
    const normalized = clientOrigin.replace(/\/$/, "")
    return isAllowedAuthOrigin(normalized) ? normalized : null
  }
  const envBase = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "")
  if (envBase && isAllowedAuthOrigin(envBase)) return envBase
  if (process.env.NODE_ENV !== "production") {
    const fwdHost = request.headers.get("x-forwarded-host")?.split(",")[0].trim()
    const fwdProto = request.headers.get("x-forwarded-proto") ?? "https"
    if (fwdHost && !fwdHost.startsWith("localhost"))
      return `${fwdProto}://${fwdHost}`
    return new URL(request.url).origin
  }
  return null
}

async function fetchSteamProfile(steamId: string): Promise<{ name: string | null; avatar: string | null }> {
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

  try {
    const res = await fetch(`https://steamcommunity.com/profiles/${steamId}/?xml=1`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    })
    const xml = await res.text()
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
  if (!baseUrl) {
    return NextResponse.redirect(new URL("/", request.url))
  }
  const searchParams = request.nextUrl.searchParams
  const ingressToken = searchParams.get("_ingress_token")
  const params = Object.fromEntries(searchParams.entries())

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

  const token = signSession({ steamId, steamName, steamAvatar })
  const response = NextResponse.redirect(buildHomeUrl({ authSuccess: "1" }))
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions())
  return response
}
