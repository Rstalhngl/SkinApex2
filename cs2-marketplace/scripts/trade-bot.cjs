#!/usr/bin/env node
/**
 * SkinApex Steam trade bot worker.
 *
 * Sends trade offers to buyers for queued sales and polls offer state.
 * Optionally auto-accepts incoming deposit offers (seller → bot).
 *
 * Requires: TRADE_BOT_ENABLED=true on the Next.js app + credentials below.
 *
 * Usage: pnpm trade-bot
 */
const { readFile } = require("fs/promises")
const path = require("path")
const SteamUser = require("steam-user")
const SteamCommunity = require("steamcommunity")
const TradeOfferManager = require("steam-tradeoffer-manager")

const ROOT = path.join(__dirname, "..")
const CS2_APP_ID = 730
const CS2_CONTEXT = "2"
const POLL_MS = Number(process.env.TRADE_BOT_POLL_MS || 15_000)

const EOfferState = TradeOfferManager.ETradeOfferState

const STATE_MAP = {
  [EOfferState.Active]: "active",
  [EOfferState.Accepted]: "accepted",
  [EOfferState.Expired]: "expired",
  [EOfferState.Canceled]: "canceled",
  [EOfferState.Declined]: "declined",
  [EOfferState.InvalidItems]: "failed",
  [EOfferState.ConfirmationNeeded]: "sent",
}

async function loadEnvLocal() {
  for (const name of [".env.local", ".env"]) {
    try {
      const raw = await readFile(path.join(ROOT, name), "utf-8")
      for (const line of raw.split("\n")) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith("#")) continue
        const eq = trimmed.indexOf("=")
        if (eq <= 0) continue
        const key = trimmed.slice(0, eq).trim()
        let val = trimmed.slice(eq + 1).trim()
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1)
        }
        if (!process.env[key]) process.env[key] = val
      }
      return
    } catch {}
  }
}

function requireEnv(name) {
  const val = process.env[name]?.trim()
  if (!val) {
    console.error(`[trade-bot] Missing env: ${name}`)
    process.exit(1)
  }
  return val
}

function parseTradeUrl(url) {
  try {
    const parsed = new URL(url.trim())
    const partner = parsed.searchParams.get("partner")
    const token = parsed.searchParams.get("token")
    if (!partner || !token || !/^\d+$/.test(partner)) return null
    const partnerSteamId = (BigInt(partner) + 76561197960265728n).toString()
    return { partnerSteamId, token }
  } catch {
    return null
  }
}

function mapOfferState(steamState) {
  return STATE_MAP[steamState] || "active"
}

async function apiFetch(route, options = {}) {
  const base = (process.env.TRADE_BOT_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "")
  const key = requireEnv("TRADE_BOT_API_KEY")
  const res = await fetch(`${base}${route}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-trade-bot-key": key,
      ...(options.headers || {}),
    },
  })
  return res
}

async function reportOfferSent(saleId, steamOfferId) {
  const res = await apiFetch("/api/internal/trade-bot/offer-sent", {
    method: "POST",
    body: JSON.stringify({ saleId, steamOfferId }),
  })
  if (!res.ok) {
    const text = await res.text()
    console.error(`[trade-bot] offer-sent failed ${saleId}: ${res.status} ${text}`)
  }
}

async function reportOfferUpdate(saleId, tradeOfferState, extra = {}) {
  const res = await apiFetch("/api/internal/trade-bot/offer-update", {
    method: "POST",
    body: JSON.stringify({ saleId, tradeOfferState, ...extra }),
  })
  if (!res.ok) {
    const text = await res.text()
    console.error(`[trade-bot] offer-update failed ${saleId}: ${res.status} ${text}`)
  }
}

function confirmOffer(community, identitySecret, offerId) {
  return new Promise((resolve) => {
    community.acceptConfirmationForObject(identitySecret, offerId, (err) => {
      if (err) console.error(`[trade-bot] confirmation failed for ${offerId}:`, err.message)
      resolve(!err)
    })
  })
}

function sendTradeOffer(manager, partnerSteamId, token, assetId, message) {
  return new Promise((resolve, reject) => {
    const offer = manager.createOffer(partnerSteamId, token)
    offer.addMyItem({ appid: CS2_APP_ID, contextid: CS2_CONTEXT, assetid: assetId })
    offer.setMessage(message || "SkinApex delivery")
    offer.send((err, status) => {
      if (err) return reject(err)
      resolve({ offer, status })
    })
  })
}

function getOfferDetails(manager, offerId) {
  return new Promise((resolve, reject) => {
    manager.getOffer(offerId, (err, offer) => {
      if (err) return reject(err)
      resolve(offer)
    })
  })
}

function acceptOffer(offer) {
  return new Promise((resolve, reject) => {
    offer.accept((err, status) => {
      if (err) return reject(err)
      resolve(status)
    })
  })
}

function declineOffer(offer) {
  return new Promise((resolve, reject) => {
    offer.decline((err) => {
      if (err) return reject(err)
      resolve()
    })
  })
}

function getReceivedOffers(manager) {
  return new Promise((resolve, reject) => {
    manager.getOffers(EOfferState.Active, (err, _sent, received) => {
      if (err) return reject(err)
      resolve(received || [])
    })
  })
}

async function main() {
  await loadEnvLocal()

  const username = requireEnv("STEAM_BOT_USERNAME")
  const password = requireEnv("STEAM_BOT_PASSWORD")
  const sharedSecret = requireEnv("STEAM_BOT_SHARED_SECRET")
  const identitySecret = process.env.STEAM_BOT_IDENTITY_SECRET?.trim() || ""
  const autoAcceptDeposits = process.env.TRADE_BOT_AUTO_ACCEPT_DEPOSITS === "true"

  requireEnv("TRADE_BOT_API_KEY")

  const client = new SteamUser()
  const community = new SteamCommunity()
  const manager = new TradeOfferManager({
    steam: client,
    community,
    language: "english",
    pollInterval: POLL_MS,
  })

  let ready = false
  const saleByOfferId = new Map()

  client.on("loggedOn", () => {
    console.log("[trade-bot] Logged into Steam")
    client.setPersona(SteamUser.EPersonaState.Online)
  })

  client.on("error", (err) => {
    console.error("[trade-bot] Steam client error:", err.message)
  })

  client.on("webSession", (_sessionId, cookies) => {
    manager.setCookies(cookies, (err) => {
      if (err) {
        console.error("[trade-bot] Failed to set trade cookies:", err.message)
        return
      }
      ready = true
      console.log("[trade-bot] Trade offer manager ready")
    })
    community.setCookies(cookies)
  })

  manager.on("sentOfferChanged", async (offer, oldState) => {
    const saleId = saleByOfferId.get(String(offer.id))
    if (!saleId) return
    const mapped = mapOfferState(offer.state)
    console.log(`[trade-bot] Offer ${offer.id} (${saleId}): ${oldState} → ${offer.state} (${mapped})`)
    await reportOfferUpdate(saleId, mapped, { steamOfferId: String(offer.id) })
  })

  manager.on("newOffer", async (offer) => {
    if (!autoAcceptDeposits) {
      console.log(`[trade-bot] Incoming offer ${offer.id} (auto-accept disabled)`)
      return
    }

    const itemsToGive = offer.itemsToGive || []
    const itemsToReceive = offer.itemsToReceive || []
    if (itemsToGive.length > 0) {
      console.log(`[trade-bot] Declining incoming ${offer.id} — bot would give items`)
      try {
        await declineOffer(offer)
      } catch (err) {
        console.error(`[trade-bot] Decline failed ${offer.id}:`, err.message)
      }
      return
    }

    if (itemsToReceive.length === 0) {
      console.log(`[trade-bot] Ignoring empty incoming offer ${offer.id}`)
      return
    }

    try {
      if (offer.state === EOfferState.ConfirmationNeeded && identitySecret) {
        await confirmOffer(community, identitySecret, offer.id)
      }
      await acceptOffer(offer)
      console.log(`[trade-bot] Accepted deposit offer ${offer.id} (${itemsToReceive.length} item(s))`)
    } catch (err) {
      console.error(`[trade-bot] Accept deposit failed ${offer.id}:`, err.message)
    }
  })

  client.logOn({
    accountName: username,
    password,
    twoFactorCode: SteamUser.generateAuthCode(sharedSecret),
  })

  async function processPending() {
    if (!ready) return

    const res = await apiFetch("/api/internal/trade-bot/pending")
    if (!res.ok) {
      console.error(`[trade-bot] pending fetch failed: ${res.status}`)
      return
    }

    const data = await res.json()
    const pending = Array.isArray(data.pending) ? data.pending : []
    const tracked = Array.isArray(data.tracked) ? data.tracked : []

    for (const job of pending) {
      const trade = parseTradeUrl(job.buyerTradeUrl)
      if (!trade) {
        await reportOfferUpdate(job.saleId, "failed", { error: "invalid_trade_url" })
        continue
      }

      try {
        const { offer, status } = await sendTradeOffer(
          manager,
          trade.partnerSteamId,
          trade.token,
          job.assetId,
          `SkinApex: ${job.itemName}`,
        )

        const offerId = String(offer.id)
        saleByOfferId.set(offerId, job.saleId)
        await reportOfferSent(job.saleId, offerId)
        console.log(`[trade-bot] Sent offer ${offerId} for ${job.saleId} (status ${status})`)

        if (status === "pending" && identitySecret) {
          await confirmOffer(community, identitySecret, offerId)
        }
      } catch (err) {
        console.error(`[trade-bot] Send failed ${job.saleId}:`, err.message)
        await reportOfferUpdate(job.saleId, "failed", { error: err.message })
      }
    }

    for (const job of tracked) {
      if (!job.steamOfferId) continue
      try {
        const offer = await getOfferDetails(manager, job.steamOfferId)
        const mapped = mapOfferState(offer.state)
        if (mapped !== job.tradeOfferState) {
          saleByOfferId.set(String(offer.id), job.saleId)
          await reportOfferUpdate(job.saleId, mapped, { steamOfferId: String(offer.id) })
        }
        if (offer.state === EOfferState.ConfirmationNeeded && identitySecret) {
          await confirmOffer(community, identitySecret, offer.id)
        }
      } catch (err) {
        console.error(`[trade-bot] Poll failed ${job.saleId}:`, err.message)
      }
    }

    if (autoAcceptDeposits) {
      try {
        const received = await getReceivedOffers(manager)
        for (const offer of received) {
          const itemsToGive = offer.itemsToGive || []
          const itemsToReceive = offer.itemsToReceive || []
          if (itemsToGive.length > 0 || itemsToReceive.length === 0) continue
          if (offer.state === EOfferState.ConfirmationNeeded && identitySecret) {
            await confirmOffer(community, identitySecret, offer.id)
          }
          await acceptOffer(offer)
          console.log(`[trade-bot] Accepted polled deposit ${offer.id}`)
        }
      } catch (err) {
        console.error("[trade-bot] Incoming poll error:", err.message)
      }
    }
  }

  setInterval(() => {
    processPending().catch((err) => console.error("[trade-bot] loop error:", err.message))
  }, POLL_MS)

  console.log(`[trade-bot] Worker started (poll every ${POLL_MS}ms)`)
}

main().catch((err) => {
  console.error("[trade-bot] Fatal:", err)
  process.exit(1)
})
