import type { Skin } from "@/lib/skins"

export function cartListingIds(cart: Skin[]): string[] {
  return cart.map((skin) => skin.listingId).filter((id): id is string => !!id)
}

export function mergeCartSkin(cart: Skin[], skin: Skin): Skin[] {
  if (!skin.listingId) return cart
  if (cart.some((item) => item.listingId === skin.listingId)) return cart
  return [...cart, skin]
}

export function removeCartListing(cart: Skin[], listingId: string): Skin[] {
  return cart.filter((item) => item.listingId !== listingId)
}
