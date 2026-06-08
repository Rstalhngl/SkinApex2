const { createHmac, timingSafeEqual } = require("crypto")

const MAX_AGE_MS = 60 * 60 * 1000

function getSecret() {
  const secret = process.env.SESSION_SECRET?.trim()
  if (!secret) {
    throw new Error("SESSION_SECRET is required for WebSocket auth")
  }
  return secret
}

function signWsToken(steamId) {
  const payload = { steamId, exp: Date.now() + MAX_AGE_MS }
  const json = JSON.stringify(payload)
  const sig = createHmac("sha256", getSecret()).update(json).digest("base64url")
  return `${Buffer.from(json).toString("base64url")}.${sig}`
}

function verifyWsToken(token) {
  if (typeof token !== "string" || !token) return null

  const dot = token.lastIndexOf(".")
  if (dot <= 0) return null

  const jsonB64 = token.slice(0, dot)
  const sig = token.slice(dot + 1)

  let json
  try {
    json = Buffer.from(jsonB64, "base64url").toString("utf-8")
  } catch {
    return null
  }

  const expected = createHmac("sha256", getSecret()).update(json).digest("base64url")
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }

  try {
    const payload = JSON.parse(json)
    if (!payload?.steamId || typeof payload.exp !== "number") return null
    if (payload.exp < Date.now()) return null
    return { steamId: payload.steamId }
  } catch {
    return null
  }
}

module.exports = { signWsToken, verifyWsToken }
