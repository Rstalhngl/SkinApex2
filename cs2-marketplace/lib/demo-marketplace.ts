import type { Skin } from "@/lib/skins"

/** CS2 catalog entries shown for browse/demo — not purchasable without a listingId. */
export function isDemoSkin(skin: Pick<Skin, "listingId">): boolean {
  return !skin.listingId
}

export function getBrowseableDemoSkins(catalog: Skin[]): Skin[] {
  return catalog.filter((skin) => skin.owner !== "me")
}

export function mergeMarketplaceSkins(realListings: Skin[], demoCatalog: Skin[]): Skin[] {
  return [...realListings, ...getBrowseableDemoSkins(demoCatalog)]
}
