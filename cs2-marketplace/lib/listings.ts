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

export function markSold(listingId: string): Listing | null {
  let sold: Listing | null = null
  listings = listings.map((l) => {
    if (l.id === listingId && l.status === "active") {
      sold = { ...l, status: "sold", soldAt: Date.now() }
      return sold
    }
    return l
  })
  if (sold) notify()
  return sold
}

export function cancelListing(listingId: string): void {
  listings = listings.map((l) =>
    l.id === listingId && l.status === "active" ? { ...l, status: "cancelled" } : l,
  )
  notify()
}

export function getListings(): Listing[] { return listings }
export function getActiveListings(): Listing[] { return listings.filter((l) => l.status === "active") }

export function subscribeListings(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
