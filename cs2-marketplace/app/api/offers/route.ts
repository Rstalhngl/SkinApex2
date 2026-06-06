import { NextResponse } from "next/server"
import type { StoredOffer } from "@/lib/offer-types"
import { isSession, requireSession } from "@/lib/api-auth"
import { addUserNotification } from "@/lib/notifications-store"
import { readListingsStore } from "@/lib/listings-store"
import { readOffersStore, writeOffersStore } from "@/lib/offers-store"
import { completePurchase } from "@/lib/purchase-service"
import { getUserTradeUrl } from "@/lib/user-store"

export async function GET(req: Request) {
  const session = await requireSession()
  if (!isSession(session)) return session

  try {
    const store = await readOffersStore()
    const offers = store.offers.filter(
      (o) => o.sellerId === session.steamId || o.buyerId === session.steamId,
    )
    return NextResponse.json({ offers })
  } catch {
    return NextResponse.json({ offers: [] })
  }
}

export async function POST(req: Request) {
  const session = await requireSession()
  if (!isSession(session)) return session

  try {
    const body = await req.json()
    const { listingId, offerTry } = body as {
      listingId?: string
      offerTry?: number
    }

    if (!listingId || !offerTry || offerTry <= 0) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 })
    }

    const listingsStore = await readListingsStore()
    const listing = listingsStore.listings.find(
      (l) => l.id === listingId && l.status === "active",
    )
    if (!listing) {
      return NextResponse.json({ error: "listing_not_found" }, { status: 404 })
    }
    if (listing.sellerId === session.steamId) {
      return NextResponse.json({ error: "cannot_offer_own_listing" }, { status: 400 })
    }

    const minTry = Math.round(listing.priceTry * 0.6)
    if (offerTry < minTry) {
      return NextResponse.json({ error: "offer_too_low", minTry }, { status: 400 })
    }
    if (offerTry > listing.priceTry) {
      return NextResponse.json({ error: "offer_too_high", maxTry: listing.priceTry }, { status: 400 })
    }

    const offersStore = await readOffersStore()
    const offer: StoredOffer = {
      id: `offer-${offersStore.nextId++}`,
      listingId: listing.id,
      sellerId: listing.sellerId,
      sellerName: listing.sellerName,
      buyerId: session.steamId,
      buyerName: session.steamName ?? session.steamId,
      buyerAvatar: session.steamAvatar ?? undefined,
      itemName: listing.name,
      itemImg: listing.img,
      offerTry,
      listingTry: listing.priceTry,
      status: "pending",
      createdAt: Date.now(),
    }

    offersStore.offers = [offer, ...offersStore.offers]
    await writeOffersStore(offersStore)

    const fmt = (v: number) =>
      new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(v)

    await addUserNotification(
      listing.sellerId,
      "offer_received",
      `${session.steamName ?? "Bir kullanıcı"} teklif verdi: ${listing.name} — ${fmt(offerTry)}`,
      { listingId: listing.id },
    )

    return NextResponse.json({ offer })
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const session = await requireSession()
  if (!isSession(session)) return session

  try {
    const body = await req.json()
    const { offerId, status } = body as {
      offerId?: string
      status?: StoredOffer["status"]
    }

    if (!offerId || !status) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 })
    }

    const store = await readOffersStore()
    const idx = store.offers.findIndex((o) => o.id === offerId)
    if (idx === -1) {
      return NextResponse.json({ error: "offer_not_found" }, { status: 404 })
    }

    const offer = store.offers[idx]
    if (offer.sellerId !== session.steamId && offer.buyerId !== session.steamId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }

    if (status === "accepted" && offer.sellerId !== session.steamId) {
      return NextResponse.json({ error: "only_seller_can_accept" }, { status: 403 })
    }

    if (status === "accepted" && offer.status === "pending") {
      const buyerTradeUrl = await getUserTradeUrl(offer.buyerId)
      if (!buyerTradeUrl) {
        return NextResponse.json({ error: "buyer_no_trade_url" }, { status: 400 })
      }

      const purchase = await completePurchase(
        offer.listingId,
        {
          steamId: offer.buyerId,
          steamName: offer.buyerName,
          tradeUrl: buyerTradeUrl,
        },
        offer.offerTry,
        "offer_purchase",
      )

      if (!purchase.ok) {
        return NextResponse.json({ error: purchase.error }, { status: 400 })
      }
    }

    store.offers[idx] = { ...offer, status }
    await writeOffersStore(store)

    const fmt = (v: number) =>
      new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(v)

    if (status === "accepted" || status === "rejected") {
      await addUserNotification(
        offer.buyerId,
        status === "accepted" ? "offer_accepted" : "offer_rejected",
        status === "accepted"
          ? `Teklifiniz kabul edildi: ${offer.itemName} — ${fmt(offer.offerTry)}`
          : `Teklifiniz reddedildi: ${offer.itemName}`,
        { listingId: offer.listingId },
      )
    }

    return NextResponse.json({ offer: store.offers[idx] })
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
