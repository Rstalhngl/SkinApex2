export type SaleStatus = "pending_delivery" | "delivered" | "expired"

export interface Sale {
  id: string
  listingId: string
  sellerId: string
  sellerName: string
  buyerId: string
  buyerName: string
  itemName: string
  itemImg: string
  exterior: string
  priceTry: number
  netToSeller: number
  soldAt: number
  deliveryDeadline: number
  status: SaleStatus
}

export interface SalesStore {
  sales: Sale[]
  nextId: number
}

export const DELIVERY_HOURS = 2
export const DELIVERY_MS = DELIVERY_HOURS * 60 * 60 * 1000
