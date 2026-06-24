export type OfferStatus = "pending" | "accepted" | "rejected" | "withdrawn"

export interface StoredOffer {
  id: string
  listingId: string
  sellerId: string
  sellerName: string
  buyerId: string
  buyerName: string
  buyerAvatar?: string
  itemName: string
  itemImg: string
  offerTry: number
  listingTry: number
  status: OfferStatus
  createdAt: number
  /** Buyer accepted MSS when placing the offer (required for accept). */
  buyerMssAccepted?: boolean
}

export interface OffersStore {
  offers: StoredOffer[]
  nextId: number
}
