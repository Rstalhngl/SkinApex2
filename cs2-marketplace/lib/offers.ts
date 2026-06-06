"use client"

import type { StoredOffer } from "@/lib/offer-types"

export type OfferStatus = "pending" | "accepted" | "rejected" | "withdrawn"
export type OfferDirection = "incoming" | "outgoing"

export interface Offer {
  id: string
  skinId: number
  skinName: string
  skinImg: string
  offerPrice: number   // TRY
  listingPrice: number // TRY
  status: OfferStatus
  direction: OfferDirection
  createdAt: number
  fromName: string
  fromAvatar?: string
  listingId?: string
}

export interface Notification {
  id: string
  type: "offer_received" | "offer_accepted" | "offer_rejected" | "offer_withdrawn"
  message: string
  offerId: string
  createdAt: number
  read: boolean
}

let offers: Offer[] = []
let notifications: Notification[] = []
let nextOfferId = 1
let nextNotifId = 1

const offerListeners = new Set<() => void>()
const notifListeners = new Set<() => void>()

function notifyOfferListeners() { offerListeners.forEach((cb) => cb()) }
function notifyNotifListeners() { notifListeners.forEach((cb) => cb()) }

function fmtTry(v: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(v)
}

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
    const res = await fetch(`/api/offers?steamId=${encodeURIComponent(steamId)}`)
    if (!res.ok) return
    const data = await res.json()
    const stored = Array.isArray(data.offers) ? (data.offers as StoredOffer[]) : []
    const serverOffers = stored.map((o) => storedToOffer(o, steamId))
    const localOnly = offers.filter((o) => !o.listingId)
    offers = [...serverOffers, ...localOnly]
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
  userName: string,
  userAvatar: string | null | undefined,
  buyerSteamId: string,
): Promise<Offer | null> {
  if (skin.listingId) {
    try {
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: skin.listingId,
          offerTry,
          buyer: { steamId: buyerSteamId, steamName: userName, steamAvatar: userAvatar },
        }),
      })
      if (!res.ok) return null

      const data = await res.json()
      const stored = data.offer as StoredOffer
      const offer = storedToOffer(stored, buyerSteamId)
      offers = [offer, ...offers.filter((o) => o.id !== offer.id)]
      notifyOfferListeners()
      return offer
    } catch {
      return null
    }
  }

  const offer: Offer = {
    id: `offer-${nextOfferId++}`,
    skinId: skin.id,
    skinName: `${skin.type} | ${skin.title}`,
    skinImg: skin.img,
    offerPrice: offerTry,
    listingPrice: skin.price,
    status: "pending",
    direction: "outgoing",
    createdAt: Date.now(),
    fromName: userName,
    fromAvatar: userAvatar ?? undefined,
  }
  offers = [offer, ...offers]
  notifyOfferListeners()

  const incomingMirror: Offer = {
    ...offer,
    id: `offer-${nextOfferId++}`,
    direction: "incoming",
  }
  offers = [incomingMirror, ...offers]
  notifyOfferListeners()

  addNotification({
    type: "offer_received",
    message: `${userName} teklif verdi: ${offer.skinName} — ${fmtTry(offerTry)}`,
    offerId: incomingMirror.id,
  })

  const delay = 3000 + Math.random() * 5000
  setTimeout(() => simulateResponse(offer.id), delay)

  return offer
}

function simulateResponse(offerId: string) {
  const offer = offers.find((o) => o.id === offerId)
  if (!offer || offer.status !== "pending") return

  const ratio = offer.offerPrice / offer.listingPrice
  const acceptChance = ratio >= 0.75 ? 0.6 : 0.3
  const accepted = Math.random() < acceptChance
  const newStatus = accepted ? "accepted" : "rejected"

  offers = offers.map((o) => (o.id === offerId ? { ...o, status: newStatus } : o))
  notifyOfferListeners()

  addNotification({
    type: accepted ? "offer_accepted" : "offer_rejected",
    message: accepted
      ? `Teklifiniz kabul edildi: ${offer.skinName} — ${fmtTry(offer.offerPrice)}`
      : `Teklifiniz reddedildi: ${offer.skinName}`,
    offerId,
  })
}

async function updateServerOffer(
  offerId: string,
  status: OfferStatus,
  steamId: string,
): Promise<boolean> {
  try {
    const res = await fetch("/api/offers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offerId, status, steamId }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function updateOfferStatus(offerId: string, status: OfferStatus, steamId?: string) {
  const offer = offers.find((o) => o.id === offerId)
  if (offer?.listingId && steamId) {
    const ok = await updateServerOffer(offerId, status, steamId)
    if (ok) void syncOffers(steamId)
    return
  }

  offers = offers.map((o) => (o.id === offerId ? { ...o, status } : o))
  notifyOfferListeners()

  const updated = offers.find((o) => o.id === offerId)
  if (!updated) return

  if (status === "accepted") {
    addNotification({
      type: "offer_accepted",
      message: `Teklifiniz kabul edildi: ${updated.skinName} — ${fmtTry(updated.offerPrice)}`,
      offerId,
    })
  } else if (status === "rejected") {
    addNotification({
      type: "offer_rejected",
      message: `Teklifiniz reddedildi: ${updated.skinName}`,
      offerId,
    })
  } else if (status === "withdrawn") {
    addNotification({
      type: "offer_withdrawn",
      message: `Teklifiniz geri çekildi: ${updated.skinName}`,
      offerId,
    })
  }
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

function addNotification(n: Omit<Notification, "id" | "createdAt" | "read">) {
  notifications = [{
    ...n,
    id: `notif-${nextNotifId++}`,
    createdAt: Date.now(),
    read: false,
  }, ...notifications].slice(0, 50)
  notifyNotifListeners()
}

export function markAllRead() {
  notifications = notifications.map((n) => ({ ...n, read: true }))
  notifyNotifListeners()
}

export function markRead(id: string) {
  notifications = notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
  notifyNotifListeners()
}

export function getOffers(): Offer[] { return offers }
export function getNotifications(): Notification[] { return notifications }
export function getUnreadCount(): number { return notifications.filter((n) => !n.read).length }

export function subscribeOffers(cb: () => void): () => void {
  offerListeners.add(cb)
  return () => offerListeners.delete(cb)
}

export function subscribeNotifications(cb: () => void): () => void {
  notifListeners.add(cb)
  return () => notifListeners.delete(cb)
}
