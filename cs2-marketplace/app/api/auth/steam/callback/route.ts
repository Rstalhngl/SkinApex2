import { NextRequest, NextResponse } from "next/server"

const STEAM_OPENID = "https://steamcommunity.com/openid/login"
const STEAM_ID_REGEX = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || url.origin

  const params = Object.fromEntries(url.searchParams.entries())

  // Verify with Steam OpenID
  const verifyParams = new URLSearchParams({
    ...params,
    "openid.mode": "check_authentication",
  })

  let isValid = false
  try {
    const verifyRes = await fetch(STEAM_OPENID, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: verifyParams.toString(),
    })
    const verifyText = await verifyRes.text()
    isValid = verifyText.includes("is_valid:true")
  } catch {
    // network error – reject
  }

  if (!isValid) {
    return NextResponse.redirect(`${baseUrl}/?authError=1`)
  }

  const claimedId = params["openid.claimed_id"] ?? ""
  const match = claimedId.match(STEAM_ID_REGEX)
  if (!match) {
    return NextResponse.redirect(`${baseUrl}/?authError=1`)
  }

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
    } catch {
      // ignore – profile info optional
    }
  }

  // Build redirect back to home with Steam data in query params
  const redirectTo = new URL(baseUrl)
  redirectTo.searchParams.set("steamId", steamId)
  if (steamName) redirectTo.searchParams.set("steamName", steamName)
  if (steamAvatar) redirectTo.searchParams.set("steamAvatar", steamAvatar)

  return NextResponse.redirect(redirectTo.toString())
}
