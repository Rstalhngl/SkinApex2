"use client"

import type { InventoryItem } from "@/lib/inventory-types"
import type { Listing } from "@/lib/listing-types"
import { formatPrice } from "@/lib/skins"
import { pushActivity } from "@/lib/activity-feed"

export type { Listing, ListingStatus } from "@/lib/listing-types"

let listings: Listing[] = []
const listeners = new Set<() => void>()

function notify() { listeners.forEach((cb) => cb()) }

export async function syncListings(): Promise<void> {
  try {
    const res = await fetch("/api/listings")
    if (!res.ok) return
    const data = await res.json()
    listings = Array.isArray(data.listings) ? data.listings : []
    notify()
  } catch {
    // keep local cache on network error
  }
}

export async function createListing(
  item: InventoryItem,
  priceTry: number,
  seller: { steamId: string; steamName: string | null; steamAvatar: string | null },
): Promise<Listing | null> {
  try {
    const res = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item, priceTry, seller }),
    })
    if (!res.ok) return null

    const data = await res.json()
    const listing = data.listing as Listing
    if (!listing?.id) return null

    listings = [listing, ...listings.filter((l) => l.id !== listing.id)]
    notify()

    const label = `${listing.type} | ${listing.name}`
    pushActivity(label, "listed", formatPrice(priceTry))

    return listing
  } catch {
    return null
  }
}

export async function purchaseListing(
  listingId: string,
  buyer: { steamId: string; steamName: string | null; tradeUrl: string },
): Promise<boolean> {
  try {
    const res = await fetch("/api/listings/sell", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, buyer }),
    })
    if (!res.ok) return false

    listings = listings
      .map((l) =>
        l.id === listingId && l.status === "active"
          ? { ...l, status: "sold" as const, soldAt: Date.now() }
          : l,
      )
      .filter((l) => l.status === "active")
    notify()
    return true
  } catch {
    return false
  }
}

export async function cancelListing(
  listingId: string,
  sellerId: string,
): Promise<boolean> {
  try {
    const res = await fetch("/api/listings/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, sellerId }),
    })
    if (!res.ok) return false

    listings = listings
      .map((l) =>
        l.id === listingId && l.status === "active"
          ? { ...l, status: "cancelled" as const }
          : l,
      )
      .filter((l) => l.status === "active")
    notify()
    return true
  } catch {
    return false
  }
}

export function getListings(): Listing[] { return listings }
export function getActiveListings(): Listing[] { return listings.filter((l) => l.status === "active") }

export function subscribeListings(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
