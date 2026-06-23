import { isDbEnabled } from "@/lib/db"

const DEV_SESSION_FALLBACK = "skx-dev-secret-change-in-production"

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim()
  if (secret) return secret
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production")
  }
  return DEV_SESSION_FALLBACK
}

/** Demo wallet top-ups without a payment gateway. Off by default in production. */
export function isDemoDepositEnabled(): boolean {
  if (process.env.ALLOW_DEMO_DEPOSITS === "true") return true
  if (process.env.NODE_ENV !== "production") return true
  return false
}

/** Real IBAN payout pipeline must be wired before enabling withdraw. */
export function isWithdrawEnabled(): boolean {
  return process.env.ALLOW_WITHDRAWALS === "true"
}

export const CURRENT_TOS_VERSION = "2025-06-v2"

/** Minimum single cash-out amount (TRY). */
export function getWithdrawMinTry(): number {
  const v = Number(process.env.WITHDRAW_MIN_TRY ?? 100)
  return Number.isFinite(v) && v > 0 ? v : 100
}

/** Maximum single cash-out amount (TRY). */
export function getWithdrawMaxPerTxTry(): number {
  const v = Number(process.env.WITHDRAW_MAX_PER_TX_TRY ?? 50000)
  return Number.isFinite(v) && v > 0 ? v : 50000
}

/** Maximum total cash-out per UTC day (TRY). */
export function getWithdrawMaxDailyTry(): number {
  const v = Number(process.env.WITHDRAW_MAX_DAILY_TRY ?? 50000)
  return Number.isFinite(v) && v > 0 ? v : 50000
}

export function requireDatabaseInProduction(): void {
  if (process.env.NODE_ENV === "production" && !isDbEnabled()) {
    throw new Error("DATABASE_URL is required in production")
  }
}

export function getAllowedAuthOrigins(): string[] {
  const raw = process.env.ALLOWED_AUTH_ORIGINS ?? process.env.NEXT_PUBLIC_BASE_URL ?? ""
  return raw
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean)
}

export function isAllowedAuthOrigin(origin: string): boolean {
  const normalized = origin.trim().replace(/\/$/, "")
  if (!normalized) return false

  const allowed = getAllowedAuthOrigins()
  if (allowed.length === 0) {
    if (process.env.NODE_ENV !== "production") return true
    return false
  }

  return allowed.some((a) => a === normalized)
}

export function getCronSecret(): string | null {
  return process.env.CRON_SECRET?.trim() || process.env.WS_API_KEY?.trim() || null
}

export const LISTING_BAN_MS = 7 * 24 * 60 * 60 * 1000
