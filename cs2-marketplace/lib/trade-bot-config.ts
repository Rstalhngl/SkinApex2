export function isTradeBotEnabled(): boolean {
  return process.env.TRADE_BOT_ENABLED === "true"
}

export function getTradeBotApiKey(): string | null {
  const key = process.env.TRADE_BOT_API_KEY?.trim()
  return key || null
}

export function getTradeBotBaseUrl(): string {
  return (
    process.env.TRADE_BOT_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    "http://127.0.0.1:3000"
  ).replace(/\/$/, "")
}

export function shouldAutoAcceptDeposits(): boolean {
  return process.env.TRADE_BOT_AUTO_ACCEPT_DEPOSITS === "true"
}
