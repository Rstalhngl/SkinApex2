#!/usr/bin/env node
/**
 * Preflight check before production deploy.
 * Mirrors lib/app-config.ts getProductionChecklist rules.
 *
 * Usage: NODE_ENV=production node scripts/check-production.mjs
 * Loads .env.local if present (Next.js convention on server).
 */

import { readFileSync, existsSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")

function loadEnvFile(name) {
  const path = resolve(root, name)
  if (!existsSync(path)) return
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = val
  }
}

loadEnvFile(".env.local")
loadEnvFile(".env")

const isProd = process.env.NODE_ENV === "production"
const db = !!process.env.DATABASE_URL?.trim()
const session = !!process.env.SESSION_SECRET?.trim()
const authRaw = process.env.ALLOWED_AUTH_ORIGINS ?? process.env.NEXT_PUBLIC_BASE_URL ?? ""
const authOrigins = authRaw.split(",").map((o) => o.trim()).filter(Boolean)
const cron = !!(process.env.CRON_SECRET?.trim() || process.env.WS_API_KEY?.trim())
const wsKey = !!process.env.WS_API_KEY?.trim()
const wsPublic = !!process.env.NEXT_PUBLIC_WS_URL?.trim()
const admin = !!process.env.ADMIN_STEAM_IDS?.trim()

const checks = [
  {
    id: "database",
    ok: db || !isProd,
    level: isProd && !db ? "error" : "warn",
    message: db ? "DATABASE_URL set" : isProd ? "DATABASE_URL required in production" : "DATABASE_URL not set (dev JSON mode)",
  },
  {
    id: "sessionSecret",
    ok: session || !isProd,
    level: isProd && !session ? "error" : "warn",
    message: session ? "SESSION_SECRET set" : isProd ? "SESSION_SECRET required" : "Using dev fallback",
  },
  {
    id: "authOrigins",
    ok: authOrigins.length > 0 || !isProd,
    level: isProd && authOrigins.length === 0 ? "error" : "warn",
    message: authOrigins.length > 0 ? `Auth origins: ${authOrigins.join(", ")}` : "Set ALLOWED_AUTH_ORIGINS or NEXT_PUBLIC_BASE_URL",
  },
  {
    id: "cron",
    ok: cron,
    level: "warn",
    message: cron ? "CRON_SECRET / WS_API_KEY set" : "CRON_SECRET missing — schedule expire-sales cron",
  },
  {
    id: "websocket",
    ok: wsKey && wsPublic,
    level: "warn",
    message: wsKey && wsPublic ? "WebSocket configured" : "WS_API_KEY and/or NEXT_PUBLIC_WS_URL missing",
  },
  {
    id: "admin",
    ok: admin,
    level: "warn",
    message: admin ? "ADMIN_STEAM_IDS set" : "ADMIN_STEAM_IDS not set",
  },
]

let failed = false
console.log(`Production check (NODE_ENV=${process.env.NODE_ENV ?? "undefined"})`)
for (const c of checks) {
  const tag = c.ok ? "OK" : c.level === "error" ? "FAIL" : "WARN"
  console.log(`  [${tag}] ${c.id}: ${c.message}`)
  if (!c.ok && c.level === "error") failed = true
}

if (failed) {
  console.error("\nFix errors above before deploying to production.")
  process.exit(1)
}

console.log("\nPreflight passed.")
if (checks.some((c) => !c.ok)) {
  console.log("Warnings remain — review cron and WebSocket setup in .env.example")
}
