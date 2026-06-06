"use client"

import type { InventoryItem } from "@/lib/inventory-types"

export type ListingStatus = "active" | "sold" | "cancelled"

export interface Listing {
  id: string
  // Seller info
  sellerId: string
  sellerName: string
  sellerAvatar?: string
  // Item info (from Steam inventory)
  assetId: string
  name: string
  marketHashName: string
  img: string
  exterior: string
  rarity: string
  rarityColor: string
  type: string
  stattrak: boolean
  souvenir: boolean
  // Pricing
  priceTry: number          // seller's asking price
  commissionRate: number    // platform commission (0.07)
  netToSeller: number       // priceTry * (1 - commissionRate)
  // Status
  status: ListingStatus
  listedAt: number          // unix ms
  soldAt?: number
}

const COMMISSION = 0.07
let listings: Listing[] = []
let nextId = 1
const listeners = new Set<() => void>()

function notify() { listeners.forEach(cb => cb()) }

// ─── Actions ──────────────────────────────────────────────────────────────────

export function createListing(
  item: InventoryItem,
  priceTry: number,
  seller: { steamId: string; steamName: string | null; steamAvatar: string | null },
): Listing {
  const net = Math.round(priceTry * (1 - COMMISSION))
  const listing: Listing = {
    id: `listing-${nextId++}`,
    sellerId: seller.steamId,
    sellerName: seller.steamName ?? seller.steamId,
    sellerAvatar: seller.steamAvatar ?? undefined,
    assetId: item.assetId,
    name: item.name,
    marketHashName: item.marketHashName,
    img: item.img,
    exterior: item.exterior,
    rarity: item.rarity,
    rarityColor: item.rarityColor,
    type: item.type,
    stattrak: item.stattrak,
    souvenir: item.souvenir,
    priceTry,
    commissionRate: COMMISSION,
    netToSeller: net,
    status: "active",
    listedAt: Date.now(),
  }
  listings = [listing, ...listings]
  notify()
  return listing
}

export function markSold(listingId: string): Listing | null {
  let sold: Listing | null = null
  listings = listings.map(l => {
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
  listings = listings.map(l =>
    l.id === listingId && l.status === "active" ? { ...l, status: "cancelled" } : l
  )
  notify()
}

// ─── Getters ──────────────────────────────────────────────────────────────────

export function getListings(): Listing[] { return listings }
export function getActiveListings(): Listing[] { return listings.filter(l => l.status === "active") }

export function subscribeListings(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
