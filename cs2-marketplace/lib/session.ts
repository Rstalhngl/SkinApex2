import { createHmac, timingSafeEqual } from "crypto"

export const SESSION_COOKIE = "skx_session"
const SECRET = process.env.SESSION_SECRET || "skx-dev-secret-change-in-production"
const MAX_AGE_SEC = 30 * 24 * 60 * 60

export interface SessionPayload {
  steamId: string
  steamName: string | null
  steamAvatar: string | null
  exp: number
}

export function signSession(payload: Omit<SessionPayload, "exp">): string {
  const data: SessionPayload = { ...payload, exp: Date.now() + MAX_AGE_SEC * 1000 }
  const json = JSON.stringify(data)
  const sig = createHmac("sha256", SECRET).update(json).digest("base64url")
  return `${Buffer.from(json).toString("base64url")}.${sig}`
}

export function verifySession(token: string): SessionPayload | null {
  const dot = token.lastIndexOf(".")
  if (dot <= 0) return null

  const jsonB64 = token.slice(0, dot)
  const sig = token.slice(dot + 1)

  let json: string
  try {
    json = Buffer.from(jsonB64, "base64url").toString("utf-8")
  } catch {
    return null
  }

  const expected = createHmac("sha256", SECRET).update(json).digest("base64url")
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }

  try {
    const payload = JSON.parse(json) as SessionPayload
    if (!payload.steamId || typeof payload.exp !== "number") return null
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SEC,
  }
}
