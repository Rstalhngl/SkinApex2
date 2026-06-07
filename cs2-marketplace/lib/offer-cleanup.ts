import { addUserNotification } from "@/lib/notifications-store"
import { readOffersStore, writeOffersStore } from "@/lib/offers-store"

export async function rejectPendingOffersForListing(listingId: string): Promise<void> {
  const store = await readOffersStore()
  let changed = false

  for (let i = 0; i < store.offers.length; i++) {
    const offer = store.offers[i]
    if (offer.listingId === listingId && offer.status === "pending") {
      store.offers[i] = { ...offer, status: "rejected" }
      changed = true
      await addUserNotification(
        offer.buyerId,
        "offer_rejected",
        `Teklifiniz reddedildi (ilan satıldı): ${offer.itemName}`,
        { listingId },
      )
    }
  }

  if (changed) await writeOffersStore(store)
}
