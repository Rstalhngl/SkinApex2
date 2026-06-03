"use client"

export type OfferStatus = "pending" | "accepted" | "rejected" | "withdrawn"
export type OfferDirection = "incoming" | "outgoing"

export interface Offer {
  id: string
  skinId: number
  skinName: string
  skinImg: string
  offerPrice: number   // USD
  listingPrice: number // USD
  status: OfferStatus
  direction: OfferDirection
  createdAt: number
  fromName: string
  fromAvatar?: string
}

export interface Notification {
  id: string
  type: "offer_received" | "offer_accepted" | "offer_rejected" | "offer_withdrawn"
  message: string
  offerId: string
  createdAt: number
  read: boolean
}

// ─── In-memory stores ─────────────────────────────────────────────────────────
let offers: Offer[] = []
let notifications: Notification[] = []
let nextOfferId = 1
let nextNotifId = 1

const offerListeners = new Set<() => void>()
const notifListeners = new Set<() => void>()

function notifyOfferListeners() { offerListeners.forEach(cb => cb()) }
function notifyNotifListeners() { notifListeners.forEach(cb => cb()) }

// ─── Offer actions ────────────────────────────────────────────────────────────

export function sendOffer(
  skin: { id: number; type: string; title: string; img: string; price: number },
  offerPrice: number,
  userName: string,
  userAvatar?: string,
): Offer {
  const offer: Offer = {
    id: `offer-${nextOfferId++}`,
    skinId: skin.id,
    skinName: `${skin.type} | ${skin.title}`,
    skinImg: skin.img,
    offerPrice,
    listingPrice: skin.price,
    status: "pending",
    direction: "outgoing",
    createdAt: Date.now(),
    fromName: userName,
    fromAvatar: userAvatar ?? undefined,
  }
  offers = [offer, ...offers]
  notifyOfferListeners()

  // Simulate seller response after 3-8 seconds (demo)
  const delay = 3000 + Math.random() * 5000
  setTimeout(() => simulateResponse(offer.id), delay)

  return offer
}

function simulateResponse(offerId: string) {
  const offer = offers.find(o => o.id === offerId)
  if (!offer || offer.status !== "pending") return

  // 60% accept if offer ≥ 75% of listing price, else 30% accept
  const ratio = offer.offerPrice / offer.listingPrice
  const acceptChance = ratio >= 0.75 ? 0.6 : 0.3
  const accepted = Math.random() < acceptChance

  updateOfferStatus(offerId, accepted ? "accepted" : "rejected")
}

export function updateOfferStatus(offerId: string, status: OfferStatus) {
  offers = offers.map(o => o.id === offerId ? { ...o, status } : o)
  notifyOfferListeners()

  const offer = offers.find(o => o.id === offerId)
  if (!offer) return

  let type: Notification["type"]
  let message: string

  if (status === "accepted") {
    type = "offer_accepted"
    message = `Teklifiniz kabul edildi: ${offer.skinName} — ${fmtUsd(offer.offerPrice)}`
  } else if (status === "rejected") {
    type = "offer_rejected"
    message = `Teklifiniz reddedildi: ${offer.skinName}`
  } else if (status === "withdrawn") {
    type = "offer_withdrawn"
    message = `Teklifiniz geri çekildi: ${offer.skinName}`
  } else {
    return
  }

  addNotification({ type, message, offerId })
}

// Incoming offer simulation — can be triggered externally
export function receiveOffer(
  skin: { id: number; type: string; title: string; img: string; price: number },
  offerPrice: number,
  fromName: string,
  fromAvatar?: string,
): Offer {
  const offer: Offer = {
    id: `offer-${nextOfferId++}`,
    skinId: skin.id,
    skinName: `${skin.type} | ${skin.title}`,
    skinImg: skin.img,
    offerPrice,
    listingPrice: skin.price,
    status: "pending",
    direction: "incoming",
    createdAt: Date.now(),
    fromName,
    fromAvatar,
  }
  offers = [offer, ...offers]
  notifyOfferListeners()

  addNotification({
    type: "offer_received",
    message: `${fromName} teklifte bulundu: ${offer.skinName} — ${fmtUsd(offerPrice)}`,
    offerId: offer.id,
  })

  return offer
}

export function acceptOffer(offerId: string) {
  updateOfferStatus(offerId, "accepted")
}

export function rejectOffer(offerId: string) {
  updateOfferStatus(offerId, "rejected")
}

export function withdrawOffer(offerId: string) {
  updateOfferStatus(offerId, "withdrawn")
}

// ─── Notification actions ──────────────────────────────────────────────────────

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
  notifications = notifications.map(n => ({ ...n, read: true }))
  notifyNotifListeners()
}

export function markRead(id: string) {
  notifications = notifications.map(n => n.id === id ? { ...n, read: true } : n)
  notifyNotifListeners()
}

// ─── Getters / subscriptions ───────────────────────────────────────────────────

export function getOffers(): Offer[] { return offers }
export function getNotifications(): Notification[] { return notifications }
export function getUnreadCount(): number { return notifications.filter(n => !n.read).length }

export function subscribeOffers(cb: () => void): () => void {
  offerListeners.add(cb)
  return () => offerListeners.delete(cb)
}
export function subscribeNotifications(cb: () => void): () => void {
  notifListeners.add(cb)
  return () => notifListeners.delete(cb)
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function fmtUsd(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v)
}
