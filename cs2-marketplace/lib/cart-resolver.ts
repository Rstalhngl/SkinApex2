import { getActiveListings, getListings } from "@/lib/listings"
import { listingToSkin } from "@/lib/listing-to-skin"
import { isOwnListing, type Skin } from "@/lib/skins"

export function resolveCartItems(
  ids: string[],
  steamId: string | undefined,
  cachedSkins: Skin[],
): { ids: string[]; skins: Skin[]; prunedIds: string[] } {
  const activeById = new Map(getActiveListings().map((l) => [l.id, l]))
  const allById = new Map(getListings().map((l) => [l.id, l]))
  const cachedByListingId = new Map(
    cachedSkins.flatMap((skin) => (skin.listingId ? [[skin.listingId, skin] as const] : [])),
  )

  const nextIds: string[] = []
  const nextSkins: Skin[] = []
  const prunedIds: string[] = []

  for (const id of ids) {
    const known = allById.get(id)
    if (known && known.status !== "active") {
      prunedIds.push(id)
      continue
    }

    const active = activeById.get(id)
    if (active) {
      const skin = listingToSkin(active)
      if (isOwnListing(skin, steamId)) {
        prunedIds.push(id)
        continue
      }
      nextIds.push(id)
      nextSkins.push(skin)
      continue
    }

    const cached = cachedByListingId.get(id)
    if (cached) {
      nextIds.push(id)
      nextSkins.push(cached)
      continue
    }

    nextIds.push(id)
  }

  return { ids: nextIds, skins: nextSkins, prunedIds }
}
