export type ListingStatus = "active" | "sold" | "cancelled"

export interface Listing {
  id: string
  sellerId: string
  sellerName: string
  sellerAvatar?: string
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
  float?: number
  patternSeed?: number
  phase?: string
  priceTry: number
  commissionRate: number
  netToSeller: number
  status: ListingStatus
  listedAt: number
  soldAt?: number
}

export interface ListingsStore {
  listings: Listing[]
  nextId: number
}
