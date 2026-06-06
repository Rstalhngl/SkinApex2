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
  buyerTradeUrl?: string
}

export const SALE_STATUS_LABEL: Record<SaleStatus, string> = {
  pending_delivery: "Teslimat Bekleniyor",
  delivered: "Teslim Edildi",
  expired: "Süre Doldu",
}

export const SALE_STATUS_COLOR: Record<SaleStatus, string> = {
  pending_delivery: "text-yellow-400",
  delivered: "text-success",
  expired: "text-destructive",
}

export interface SalesStore {
  sales: Sale[]
  nextId: number
}

export const DELIVERY_HOURS = 2
export const DELIVERY_MS = DELIVERY_HOURS * 60 * 60 * 1000
