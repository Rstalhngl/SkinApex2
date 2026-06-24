import { getActiveListings, getListings } from "@/lib/listings"
import { listingToSkin } from "@/lib/listing-to-skin"
import { isOwnListing, type Skin } from "@/lib/skins"

/** One-time cart restore after login — never called from background listing sync. */
export function resolveCartItems(
  ids: string[],
  steamId: string | undefined,
  snapshots: ReadonlyMap<string, Skin>,
): { ids: string[]; skins: Skin[]; prunedIds: string[] } {
  const activeById = new Map(getActiveListings().map((l) => [l.id, l]))
  const allById = new Map(getListings().map((l) => [l.id, l]))

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

    const cached = snapshots.get(id)
    if (cached) {
      nextIds.push(id)
      nextSkins.push(cached)
      continue
    }

    prunedIds.push(id)
  }

  return { ids: nextIds, skins: nextSkins, prunedIds }
}

export function skinsFromIds(ids: string[], snapshots: ReadonlyMap<string, Skin>): Skin[] {
  return ids
    .map((id) => snapshots.get(id))
    .filter((skin): skin is Skin => !!skin)
}
