import type { Listing } from "@/lib/listing-types"
import { addUserNotification } from "@/lib/notifications-store"
import { readListingsStore, writeListingsStore } from "@/lib/listings-store"
import { publishListingsChanged } from "@/lib/ws-publish"

/** Match a bot deposit to a pending listing and activate it on the marketplace. */
export async function confirmListingDeposit(
  sellerId: string,
  botAssetId: string,
  sellerAssetId?: string,
): Promise<Listing | null> {
  const store = await readListingsStore()
  const idx = store.listings.findIndex((listing) => {
    if (listing.sellerId !== sellerId) return false
    if (listing.status !== "pending_deposit") return false
    if (sellerAssetId && listing.assetId !== sellerAssetId) return false
    return true
  })

  if (idx === -1) return null

  const listing = store.listings[idx]
  const updated: Listing = {
    ...listing,
    status: "active",
    botAssetId,
    listedAt: Date.now(),
  }
  store.listings[idx] = updated
  await writeListingsStore(store)

  await addUserNotification(
    sellerId,
    "item_sold",
    `İlanınız yayında: ${listing.name}. Bot envanterine teslim alındı.`,
    { listingId: listing.id },
  )
  publishListingsChanged()

  return updated
}
