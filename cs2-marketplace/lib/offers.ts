"use client"

import type { StoredOffer } from "@/lib/offer-types"
import { apiFetch } from "@/lib/api-client"

export type OfferStatus = "pending" | "accepted" | "rejected" | "withdrawn"
export type OfferDirection = "incoming" | "outgoing"

export interface Offer {
  id: string
  skinId: number
  skinName: string
  skinImg: string
  offerPrice: number
  listingPrice: number
  status: OfferStatus
  direction: OfferDirection
  createdAt: number
  fromName: string
  fromAvatar?: string
  listingId?: string
}

let offers: Offer[] = []
const offerListeners = new Set<() => void>()

function notifyOfferListeners() { offerListeners.forEach((cb) => cb()) }

function storedToOffer(stored: StoredOffer, viewerSteamId: string): Offer {
  const isSeller = stored.sellerId === viewerSteamId
  return {
    id: stored.id,
    skinId: 0,
    skinName: stored.itemName,
    skinImg: stored.itemImg,
    offerPrice: stored.offerTry,
    listingPrice: stored.listingTry,
    status: stored.status,
    direction: isSeller ? "incoming" : "outgoing",
    createdAt: stored.createdAt,
    fromName: isSeller ? stored.buyerName : stored.sellerName,
    fromAvatar: isSeller ? stored.buyerAvatar : undefined,
    listingId: stored.listingId,
  }
}

export async function syncOffers(steamId: string): Promise<void> {
  try {
    const res = await apiFetch("/api/offers")
    if (!res.ok) return
    const data = await res.json()
    const stored = Array.isArray(data.offers) ? (data.offers as StoredOffer[]) : []
    offers = stored.map((o) => storedToOffer(o, steamId))
    notifyOfferListeners()
  } catch {
    // keep cache
  }
}

export async function sendOffer(
  skin: {
    id: number
    type: string
    title: string
    img: string
    price: number
    listingId?: string
  },
  offerTry: number,
): Promise<{ offer?: Offer; error?: string }> {
  if (!skin.listingId) return { error: "listing_not_found" }

  try {
    const res = await apiFetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: skin.listingId, offerTry }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { error: (data as { error?: string }).error ?? "failed" }

    const stored = data.offer as StoredOffer
    const offer = storedToOffer(stored, stored.buyerId)
    offers = [offer, ...offers.filter((o) => o.id !== offer.id)]
    notifyOfferListeners()
    return { offer }
  } catch {
    return { error: "failed" }
  }
}

export async function updateOfferStatus(
  offerId: string,
  status: OfferStatus,
  steamId?: string,
): Promise<{ ok: boolean; error?: string }> {
  const offer = offers.find((o) => o.id === offerId)
  if (!offer?.listingId) return { ok: false, error: "offer_not_found" }

  try {
    const res = await apiFetch("/api/offers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offerId, status }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { ok: false, error: (data as { error?: string }).error ?? "request_failed" }
    }
    if (steamId) await syncOffers(steamId)
    return { ok: true }
  } catch {
    return { ok: false, error: "network_error" }
  }
}

export async function acceptOffer(offerId: string, steamId?: string) {
  return updateOfferStatus(offerId, "accepted", steamId)
}

export async function rejectOffer(offerId: string, steamId?: string) {
  return updateOfferStatus(offerId, "rejected", steamId)
}

export async function withdrawOffer(offerId: string, steamId?: string) {
  return updateOfferStatus(offerId, "withdrawn", steamId)
}

export function getOffers(): Offer[] { return offers }

export function subscribeOffers(cb: () => void): () => void {
  offerListeners.add(cb)
  return () => offerListeners.delete(cb)
}
