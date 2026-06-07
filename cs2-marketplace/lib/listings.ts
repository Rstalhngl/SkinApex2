"use client"

import type { InventoryItem } from "@/lib/inventory-types"
import type { Listing } from "@/lib/listing-types"
import { apiFetch } from "@/lib/api-client"
import { formatPrice } from "@/lib/skins"
import { pushActivity } from "@/lib/activity-feed"

export type { Listing, ListingStatus } from "@/lib/listing-types"

let listings: Listing[] = []
const listeners = new Set<() => void>()

function notify() { listeners.forEach((cb) => cb()) }

export async function syncListings(): Promise<void> {
  try {
    const res = await apiFetch("/api/listings")
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
): Promise<Listing | null> {
  try {
    const res = await apiFetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item, priceTry }),
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

export async function createListingWithError(
  item: InventoryItem,
  priceTry: number,
): Promise<{ listing?: Listing; error?: string }> {
  try {
    const res = await apiFetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item, priceTry }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { error: data.error ?? "failed" }

    const listing = data.listing as Listing
    if (!listing?.id) return { error: "failed" }

    listings = [listing, ...listings.filter((l) => l.id !== listing.id)]
    notify()
    const label = `${listing.type} | ${listing.name}`
    pushActivity(label, "listed", formatPrice(priceTry))
    return { listing }
  } catch {
    return { error: "failed" }
  }
}

export async function purchaseBatch(
  listingIds: string[],
  tradeUrl: string,
): Promise<{ ok: true } | { ok: false; error?: string }> {
  try {
    const res = await apiFetch("/api/listings/batch-sell", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingIds, tradeUrl }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { ok: false, error: data.error as string | undefined }
    }

    const soldSet = new Set(listingIds)
    listings = listings
      .map((l) =>
        soldSet.has(l.id) && l.status === "active"
          ? { ...l, status: "sold" as const, soldAt: Date.now() }
          : l,
      )
      .filter((l) => l.status === "active")
    notify()
    return { ok: true }
  } catch {
    return { ok: false }
  }
}

export async function updateListingPrice(
  listingId: string,
  priceTry: number,
): Promise<Listing | null> {
  try {
    const res = await apiFetch("/api/listings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, priceTry }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const listing = data.listing as Listing
    if (!listing?.id) return null
    listings = listings.map((l) => (l.id === listing.id ? listing : l))
    notify()
    return listing
  } catch {
    return null
  }
}

export async function purchaseListing(
  listingId: string,
  tradeUrl: string,
): Promise<boolean> {
  try {
    const res = await apiFetch("/api/listings/sell", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, tradeUrl }),
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

export async function cancelListing(listingId: string): Promise<boolean> {
  try {
    const res = await apiFetch("/api/listings/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
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
