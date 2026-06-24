import { getActiveListings, getListings } from "@/lib/listings"
import { listingToSkin } from "@/lib/listing-to-skin"
import { isOwnListing, type Skin } from "@/lib/skins"

function buildCachedMap(cachedSkins: Skin[], snapshots?: ReadonlyMap<string, Skin>): Map<string, Skin> {
  const map = new Map<string, Skin>()
  for (const skin of cachedSkins) {
    if (skin.listingId) map.set(skin.listingId, skin)
  }
  snapshots?.forEach((skin, listingId) => {
    if (listingId) map.set(listingId, skin)
  })
  return map
}

export function resolveCartItems(
  ids: string[],
  steamId: string | undefined,
  cachedSkins: Skin[],
  snapshots?: ReadonlyMap<string, Skin>,
): { ids: string[]; skins: Skin[]; prunedIds: string[] } {
  const activeById = new Map(getActiveListings().map((l) => [l.id, l]))
  const allById = new Map(getListings().map((l) => [l.id, l]))
  const cachedByListingId = buildCachedMap(cachedSkins, snapshots)

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

    prunedIds.push(id)
  }

  return { ids: nextIds, skins: nextSkins, prunedIds }
}
