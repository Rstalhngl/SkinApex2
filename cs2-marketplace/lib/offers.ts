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
): Promise<Offer | null> {
  if (!skin.listingId) return null

  try {
    const res = await apiFetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: skin.listingId, offerTry }),
    })
    if (!res.ok) return null

    const data = await res.json()
    const stored = data.offer as StoredOffer
    const offer = storedToOffer(stored, stored.buyerId)
    offers = [offer, ...offers.filter((o) => o.id !== offer.id)]
    notifyOfferListeners()
    return offer
  } catch {
    return null
  }
}

async function updateServerOffer(offerId: string, status: OfferStatus): Promise<boolean> {
  try {
    const res = await apiFetch("/api/offers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offerId, status }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function updateOfferStatus(offerId: string, status: OfferStatus, steamId?: string) {
  const offer = offers.find((o) => o.id === offerId)
  if (offer?.listingId) {
    const ok = await updateServerOffer(offerId, status)
    if (ok && steamId) void syncOffers(steamId)
    return ok
  }
  return false
}

export function acceptOffer(offerId: string, steamId?: string) {
  void updateOfferStatus(offerId, "accepted", steamId)
}

export function rejectOffer(offerId: string, steamId?: string) {
  void updateOfferStatus(offerId, "rejected", steamId)
}

export function withdrawOffer(offerId: string, steamId?: string) {
  void updateOfferStatus(offerId, "withdrawn", steamId)
}

export function getOffers(): Offer[] { return offers }

export function subscribeOffers(cb: () => void): () => void {
  offerListeners.add(cb)
  return () => offerListeners.delete(cb)
}
