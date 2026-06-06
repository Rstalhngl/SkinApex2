import { NextResponse } from "next/server"
import type { Sale } from "@/lib/sale-types"
import { DELIVERY_MS } from "@/lib/sale-types"
import { addUserNotification } from "@/lib/notifications-store"
import { readListingsStore, writeListingsStore } from "@/lib/listings-store"
import { readSalesStore, writeSalesStore } from "@/lib/sales-store"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { listingId, buyer } = body as {
      listingId?: string
      buyer?: { steamId?: string; steamName?: string | null }
    }

    if (!listingId || !buyer?.steamId) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 })
    }

    const listingsStore = await readListingsStore()
    const idx = listingsStore.listings.findIndex(
      (l) => l.id === listingId && l.status === "active",
    )
    if (idx === -1) {
      return NextResponse.json({ error: "listing_not_found" }, { status: 404 })
    }

    const listing = listingsStore.listings[idx]
    if (listing.sellerId === buyer.steamId) {
      return NextResponse.json({ error: "cannot_buy_own_listing" }, { status: 400 })
    }

    const soldAt = Date.now()
    const updatedListing = { ...listing, status: "sold" as const, soldAt }
    listingsStore.listings[idx] = updatedListing
    await writeListingsStore(listingsStore)

    const salesStore = await readSalesStore()
    const sale: Sale = {
      id: `sale-${salesStore.nextId++}`,
      listingId: listing.id,
      sellerId: listing.sellerId,
      sellerName: listing.sellerName,
      buyerId: buyer.steamId,
      buyerName: buyer.steamName ?? buyer.steamId,
      itemName: listing.name,
      itemImg: listing.img,
      exterior: listing.exterior,
      priceTry: listing.priceTry,
      netToSeller: listing.netToSeller,
      soldAt,
      deliveryDeadline: soldAt + DELIVERY_MS,
      status: "pending_delivery",
    }
    salesStore.sales = [sale, ...salesStore.sales]
    await writeSalesStore(salesStore)

    const itemLabel = listing.name
    await addUserNotification(
      listing.sellerId,
      "item_sold",
      `Ürününüz satıldı: ${itemLabel} — 2 saat içinde teslim edin`,
      { saleId: sale.id, listingId: listing.id },
    )

    return NextResponse.json({ sale, listing: updatedListing })
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
