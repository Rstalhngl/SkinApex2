import { NextResponse } from "next/server"
import type { StoredOffer } from "@/lib/offer-types"
import { addUserNotification } from "@/lib/notifications-store"
import { readListingsStore } from "@/lib/listings-store"
import { readOffersStore, writeOffersStore } from "@/lib/offers-store"

export async function GET(req: Request) {
  const steamId = new URL(req.url).searchParams.get("steamId")
  if (!steamId) {
    return NextResponse.json({ error: "missing_steam_id" }, { status: 400 })
  }

  try {
    const store = await readOffersStore()
    const offers = store.offers.filter(
      (o) => o.sellerId === steamId || o.buyerId === steamId,
    )
    return NextResponse.json({ offers })
  } catch {
    return NextResponse.json({ offers: [] })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { listingId, offerTry, buyer } = body as {
      listingId?: string
      offerTry?: number
      buyer?: { steamId?: string; steamName?: string | null; steamAvatar?: string | null }
    }

    if (!listingId || !offerTry || offerTry <= 0 || !buyer?.steamId) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 })
    }

    const listingsStore = await readListingsStore()
    const listing = listingsStore.listings.find(
      (l) => l.id === listingId && l.status === "active",
    )
    if (!listing) {
      return NextResponse.json({ error: "listing_not_found" }, { status: 404 })
    }
    if (listing.sellerId === buyer.steamId) {
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
      buyerId: buyer.steamId,
      buyerName: buyer.steamName ?? buyer.steamId,
      buyerAvatar: buyer.steamAvatar ?? undefined,
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
      `${buyer.steamName ?? "Bir kullanıcı"} teklif verdi: ${listing.name} — ${fmt(offerTry)}`,
      { listingId: listing.id },
    )

    return NextResponse.json({ offer })
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { offerId, status, steamId } = body as {
      offerId?: string
      status?: StoredOffer["status"]
      steamId?: string
    }

    if (!offerId || !status || !steamId) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 })
    }

    const store = await readOffersStore()
    const idx = store.offers.findIndex((o) => o.id === offerId)
    if (idx === -1) {
      return NextResponse.json({ error: "offer_not_found" }, { status: 404 })
    }

    const offer = store.offers[idx]
    if (offer.sellerId !== steamId && offer.buyerId !== steamId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
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
