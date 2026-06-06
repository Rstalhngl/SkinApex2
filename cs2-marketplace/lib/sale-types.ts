export type SaleStatus = "pending_delivery" | "delivered" | "expired" | "disputed"

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
  deliveredAt?: number
  confirmedAt?: number
  disputedAt?: number
}

export const SALE_STATUS_LABEL: Record<SaleStatus, string> = {
  pending_delivery: "Teslimat Bekleniyor",
  delivered: "Teslim Edildi",
  expired: "Süre Doldu",
  disputed: "Destek Talebi",
}

export const SALE_STATUS_COLOR: Record<SaleStatus, string> = {
  pending_delivery: "text-yellow-400",
  delivered: "text-success",
  expired: "text-destructive",
  disputed: "text-primary",
}

export interface SalesStore {
  sales: Sale[]
  nextId: number
}

export const DELIVERY_HOURS = 2
export const DELIVERY_MS = DELIVERY_HOURS * 60 * 60 * 1000
