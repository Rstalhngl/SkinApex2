export function isValidTradeUrl(url: string): boolean {
  const trimmed = url.trim()
  return (
    trimmed.startsWith("https://steamcommunity.com/tradeoffer/new/") &&
    trimmed.includes("partner=") &&
    trimmed.includes("token=")
  )
}
