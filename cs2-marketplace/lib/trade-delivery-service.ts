import type { Sale, TradeOfferState } from "@/lib/sale-types"
import { isTradeBotEnabled } from "@/lib/trade-bot-config"
import { markSaleDeliveredByBot } from "@/lib/sale-lifecycle"
import { addUserNotification } from "@/lib/notifications-store"
import { getDisputedSales, patchSale, readSalesStore } from "@/lib/sales-store"

export interface PendingBotDelivery {
  saleId: string
  assetId: string
  itemName: string
  buyerTradeUrl: string
  buyerId: string
  sellerId: string
  deliveryDeadline: number
  steamOfferId?: string
  tradeOfferState?: TradeOfferState
}

const OUTGOING_STATES: TradeOfferState[] = ["queued", "sent", "active"]

export function buildSaleTradeFields(listingAssetId: string): Pick<Sale, "assetId" | "tradeOfferState"> {
  if (!isTradeBotEnabled()) {
    return { assetId: listingAssetId }
  }
  return { assetId: listingAssetId, tradeOfferState: "queued" }
}

export async function getPendingBotDeliveries(): Promise<PendingBotDelivery[]> {
  if (!isTradeBotEnabled()) return []

  const store = await readSalesStore()
  const now = Date.now()

  return store.sales
    .filter((sale) => {
      if (sale.status !== "pending_delivery") return false
      if (!sale.assetId || !sale.buyerTradeUrl) return false
      if (sale.deliveryDeadline <= now) return false
      if (sale.steamOfferId) return false
      const state = sale.tradeOfferState
      return !state || state === "queued" || state === "failed"
    })
    .map((sale) => ({
      saleId: sale.id,
      assetId: sale.assetId!,
      itemName: sale.itemName,
      buyerTradeUrl: sale.buyerTradeUrl!,
      buyerId: sale.buyerId,
      sellerId: sale.sellerId,
      deliveryDeadline: sale.deliveryDeadline,
      steamOfferId: sale.steamOfferId,
      tradeOfferState: sale.tradeOfferState,
    }))
}

export async function getTrackedBotOffers(): Promise<PendingBotDelivery[]> {
  if (!isTradeBotEnabled()) return []

  const store = await readSalesStore()
  const now = Date.now()

  return store.sales
    .filter((sale) => {
      if (sale.status !== "pending_delivery") return false
      if (!sale.steamOfferId) return false
      if (sale.deliveryDeadline <= now) return false
      const state = sale.tradeOfferState
      return state && OUTGOING_STATES.includes(state)
    })
    .map((sale) => ({
      saleId: sale.id,
      assetId: sale.assetId ?? "",
      itemName: sale.itemName,
      buyerTradeUrl: sale.buyerTradeUrl ?? "",
      buyerId: sale.buyerId,
      sellerId: sale.sellerId,
      deliveryDeadline: sale.deliveryDeadline,
      steamOfferId: sale.steamOfferId,
      tradeOfferState: sale.tradeOfferState,
    }))
}

export async function recordOfferSent(
  saleId: string,
  steamOfferId: string,
): Promise<Sale | null> {
  const store = await readSalesStore()
  const sale = store.sales.find((s) => s.id === saleId)
  if (!sale || sale.status !== "pending_delivery") return null

  const updated: Sale = {
    ...sale,
    steamOfferId,
    tradeOfferState: "sent",
    tradeOfferError: undefined,
    tradeOfferUpdatedAt: Date.now(),
  }
  await patchSale(updated)
  return updated
}

export async function updateTradeOfferState(
  saleId: string,
  tradeOfferState: TradeOfferState,
  opts?: { steamOfferId?: string; error?: string },
): Promise<Sale | null> {
  const store = await readSalesStore()
  const sale = store.sales.find((s) => s.id === saleId)
  if (!sale) return null

  const updated: Sale = {
    ...sale,
    tradeOfferState,
    tradeOfferUpdatedAt: Date.now(),
    ...(opts?.steamOfferId ? { steamOfferId: opts.steamOfferId } : {}),
    ...(opts?.error ? { tradeOfferError: opts.error } : {}),
  }
  await patchSale(updated)

  if (tradeOfferState === "accepted" && sale.status === "pending_delivery") {
    return markSaleDeliveredByBot(saleId)
  }

  if (tradeOfferState === "declined" || tradeOfferState === "canceled" || tradeOfferState === "expired") {
    await addUserNotification(
      sale.sellerId,
      "item_sold",
      `Takas teklifi reddedildi/iptal: ${sale.itemName}. Manuel teslimat gerekebilir.`,
      { saleId: sale.id },
    )
    await addUserNotification(
      sale.buyerId,
      "item_sold",
      `Takas teklifi tamamlanamadı: ${sale.itemName}. Destek ile iletişime geçebilirsiniz.`,
      { saleId: sale.id },
    )
  }

  if (tradeOfferState === "failed" && opts?.error) {
    await addUserNotification(
      sale.sellerId,
      "item_sold",
      `Bot teslimat hatası: ${sale.itemName} — ${opts.error}`,
      { saleId: sale.id },
    )
  }

  return updated
}

/** Sales with open disputes — bot should not touch these. */
export async function getDisputedSaleIds(): Promise<Set<string>> {
  const disputed = await getDisputedSales()
  return new Set(disputed.map((s) => s.id))
}
