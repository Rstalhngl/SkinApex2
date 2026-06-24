export type SaleStatus = "pending_delivery" | "delivered" | "expired" | "disputed" | "resolved"
export type SaleResolution = "buyer_refund" | "seller_paid"

/** Steam trade offer lifecycle tracked by the trade bot worker. */
export type TradeOfferState =
  | "queued"
  | "sending"
  | "sent"
  | "active"
  | "accepted"
  | "declined"
  | "canceled"
  | "expired"
  | "failed"

export interface Sale {
  id: string
  listingId: string
  /** CS2 asset ID at time of purchase (for bot delivery). */
  assetId?: string
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
  steamOfferId?: string
  tradeOfferState?: TradeOfferState
  tradeOfferError?: string
  tradeOfferUpdatedAt?: number
  deliveredAt?: number
  confirmedAt?: number
  disputedAt?: number
  resolution?: SaleResolution
  adminNote?: string
  resolvedAt?: number
  resolvedBy?: string
  /** Seller delivery reminder sent (30 min before deadline). */
  deliveryReminderSentAt?: number
}

export const SALE_STATUS_LABEL: Record<SaleStatus, string> = {
  pending_delivery: "Teslimat Bekleniyor",
  delivered: "Teslim Edildi",
  expired: "Süre Doldu",
  disputed: "Destek Talebi",
  resolved: "Çözüldü",
}

export const SALE_STATUS_COLOR: Record<SaleStatus, string> = {
  pending_delivery: "text-yellow-400",
  delivered: "text-success",
  expired: "text-destructive",
  disputed: "text-primary",
  resolved: "text-muted-foreground",
}

export interface SalesStore {
  sales: Sale[]
  nextId: number
}

export const DELIVERY_HOURS = 2
export const DELIVERY_MS = DELIVERY_HOURS * 60 * 60 * 1000
/** Send seller reminder when this much time remains before deadline. */
export const DELIVERY_REMINDER_BEFORE_MS = 30 * 60 * 1000
