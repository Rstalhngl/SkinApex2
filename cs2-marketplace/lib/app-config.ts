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

export type ProductionCheckStatus = "ok" | "missing" | "warning"

export interface ProductionCheckItem {
  id: string
  status: ProductionCheckStatus
  message: string
}

/** Non-secret production readiness checks for health UI and deploy scripts. */
export function getProductionChecklist(): ProductionCheckItem[] {
  const isProd = process.env.NODE_ENV === "production"
  const items: ProductionCheckItem[] = []

  items.push({
    id: "database",
    status: isDbEnabled() ? "ok" : isProd ? "missing" : "warning",
    message: isDbEnabled()
      ? "PostgreSQL configured"
      : isProd
        ? "DATABASE_URL is required in production"
        : "Using JSON file storage (dev only)",
  })

  items.push({
    id: "sessionSecret",
    status: process.env.SESSION_SECRET?.trim()
      ? "ok"
      : isProd
        ? "missing"
        : "warning",
    message: process.env.SESSION_SECRET?.trim()
      ? "SESSION_SECRET set"
      : isProd
        ? "SESSION_SECRET is required in production"
        : "Using dev session secret",
  })

  const authOrigins = getAllowedAuthOrigins()
  items.push({
    id: "authOrigins",
    status: authOrigins.length > 0 ? "ok" : isProd ? "missing" : "warning",
    message: authOrigins.length > 0
      ? `Auth origins: ${authOrigins.join(", ")}`
      : isProd
        ? "Set ALLOWED_AUTH_ORIGINS or NEXT_PUBLIC_BASE_URL"
        : "Auth origins not restricted (dev)",
  })

  items.push({
    id: "cron",
    status: getCronSecret() ? "ok" : "warning",
    message: getCronSecret()
      ? "Expire-sales cron secret configured"
      : "CRON_SECRET not set — stale sales will not auto-expire",
  })

  const wsKey = process.env.WS_API_KEY?.trim()
  const wsPublic = process.env.NEXT_PUBLIC_WS_URL?.trim()
  items.push({
    id: "websocket",
    status: wsKey && wsPublic ? "ok" : wsKey || wsPublic ? "warning" : "warning",
    message: wsKey && wsPublic
      ? "WebSocket live sync configured"
      : "WS_API_KEY and/or NEXT_PUBLIC_WS_URL missing — falls back to polling",
  })

  items.push({
    id: "admin",
    status: process.env.ADMIN_STEAM_IDS?.trim() ? "ok" : "warning",
    message: process.env.ADMIN_STEAM_IDS?.trim()
      ? "Admin Steam IDs configured"
      : "ADMIN_STEAM_IDS not set — admin panel inaccessible",
  })

  items.push({
    id: "tradeBot",
    status:
      !process.env.TRADE_BOT_ENABLED || process.env.TRADE_BOT_ENABLED !== "true"
        ? "ok"
        : process.env.TRADE_BOT_API_KEY?.trim() && process.env.STEAM_BOT_IDENTITY_SECRET?.trim()
          ? "ok"
          : "warning",
    message:
      process.env.TRADE_BOT_ENABLED !== "true"
        ? "Trade bot disabled (P2P delivery mode)"
        : process.env.TRADE_BOT_API_KEY?.trim() && process.env.STEAM_BOT_IDENTITY_SECRET?.trim()
          ? "Trade bot configured"
          : "TRADE_BOT_ENABLED=true but TRADE_BOT_API_KEY or STEAM_BOT_IDENTITY_SECRET missing",
  })

  return items
}

/** Throws on hard production misconfiguration. Call at server startup. */
export function validateProductionConfig(): void {
  requireDatabaseInProduction()
  getSessionSecret()

  if (process.env.NODE_ENV !== "production") return

  const hardFailures = getProductionChecklist().filter((c) => c.status === "missing")
  if (hardFailures.length === 0) return

  const lines = hardFailures.map((c) => `- ${c.id}: ${c.message}`)
  throw new Error(`Production configuration invalid:\n${lines.join("\n")}`)
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
