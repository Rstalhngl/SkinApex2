const STEAM_ID_OFFSET = 76561197960265728n

export function isValidTradeUrl(url: string): boolean {
  return parseTradeUrl(url) !== null
}

/** Parse buyer trade URL into partner account id, token, and SteamID64. */
export function parseTradeUrl(url: string): {
  partnerAccountId: string
  token: string
  partnerSteamId: string
} | null {
  const trimmed = url.trim()
  if (!trimmed.startsWith("https://steamcommunity.com/tradeoffer/new/")) return null

  let partnerAccountId: string | null = null
  let token: string | null = null

  try {
    const parsed = new URL(trimmed)
    partnerAccountId = parsed.searchParams.get("partner")
    token = parsed.searchParams.get("token")
  } catch {
    return null
  }

  if (!partnerAccountId || !token) return null
  if (!/^\d+$/.test(partnerAccountId)) return null
  if (!/^[A-Za-z0-9_-]+$/.test(token)) return null

  const partnerSteamId = (BigInt(partnerAccountId) + STEAM_ID_OFFSET).toString()
  return { partnerAccountId, token, partnerSteamId }
}
