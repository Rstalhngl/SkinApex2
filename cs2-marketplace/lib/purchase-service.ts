import type { Listing } from "@/lib/listing-types"
import type { Sale } from "@/lib/sale-types"
import { DELIVERY_MS } from "@/lib/sale-types"
import { readListingsStore, writeListingsStore } from "@/lib/listings-store"
import { readSalesStore, writeSalesStore } from "@/lib/sales-store"
import { debitWallet, creditWallet } from "@/lib/wallet-store"
import { addUserNotification } from "@/lib/notifications-store"
import { isValidTradeUrl } from "@/lib/trade-url"

export interface PurchaseBuyer {
  steamId: string
  steamName: string | null
  tradeUrl: string
}

export type PurchaseResult =
  | { ok: true; sale: Sale; listing: Listing }
  | { ok: false; error: string; minBalance?: number }

export async function completePurchase(
  listingId: string,
  buyer: PurchaseBuyer,
  priceTry?: number,
  txType: "purchase" | "offer_purchase" = "purchase",
): Promise<PurchaseResult> {
  if (!isValidTradeUrl(buyer.tradeUrl)) {
    return { ok: false, error: "invalid_trade_url" }
  }

  const listingsStore = await readListingsStore()
  const idx = listingsStore.listings.findIndex(
    (l) => l.id === listingId && l.status === "active",
  )
  if (idx === -1) return { ok: false, error: "listing_not_found" }

  const listing = listingsStore.listings[idx]
  if (listing.sellerId === buyer.steamId) {
    return { ok: false, error: "cannot_buy_own_listing" }
  }

  const chargeAmount = priceTry ?? listing.priceTry
  const debit = await debitWallet(buyer.steamId, chargeAmount, txType, listingId)
  if (!debit.ok) {
    return { ok: false, error: debit.error, minBalance: chargeAmount }
  }

  const soldAt = Date.now()
  const netToSeller = Math.round(chargeAmount * (1 - listing.commissionRate))
  const updatedListing: Listing = { ...listing, status: "sold", soldAt, priceTry: chargeAmount, netToSeller }
  listingsStore.listings[idx] = updatedListing
  await writeListingsStore(listingsStore)

  const salesStore = await readSalesStore()
  const sale: Sale = {
    id: `sale-${salesStore.nextId++}`,
    listingId: listing.id,
    sellerId: listing.sellerId,
    sellerName: listing.sellerName,
    buyerId: buyer.steamId,
    buyerName: buyer.steamName ?? buyer.steamId,
    itemName: listing.name,
    itemImg: listing.img,
    exterior: listing.exterior,
    priceTry: chargeAmount,
    netToSeller,
    soldAt,
    deliveryDeadline: soldAt + DELIVERY_MS,
    status: "pending_delivery",
    buyerTradeUrl: buyer.tradeUrl.trim(),
  }
  salesStore.sales = [sale, ...salesStore.sales]
  await writeSalesStore(salesStore)

  const fmt = (v: number) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(v)

  await addUserNotification(
    listing.sellerId,
    "item_sold",
    `Ürününüz satıldı: ${listing.name} — ${fmt(chargeAmount)}. 2 saat içinde teslim edin. Alıcı Takas URL: ${buyer.tradeUrl.trim()}`,
    { saleId: sale.id, listingId: listing.id },
  )

  return { ok: true, sale, listing: updatedListing }
}

export async function refundExpiredSale(sale: Sale): Promise<void> {
  await creditWallet(sale.buyerId, sale.priceTry, "refund", sale.id, "Teslimat süresi doldu")
  await addUserNotification(
    sale.buyerId,
    "item_sold",
    `Teslimat süresi doldu, iade edildi: ${sale.itemName} — ${sale.priceTry} TL`,
    { saleId: sale.id },
  )
  await addUserNotification(
    sale.sellerId,
    "item_sold",
    `Teslimat süresi doldu: ${sale.itemName}. Alıcıya iade yapıldı.`,
    { saleId: sale.id },
  )
}

export async function payoutDeliveredSale(sale: Sale): Promise<void> {
  await creditWallet(sale.sellerId, sale.netToSeller, "sale_payout", sale.id, sale.itemName)
  await addUserNotification(
    sale.sellerId,
    "item_sold",
    `Satış tamamlandı, bakiyenize eklendi: ${sale.itemName} — ${sale.netToSeller} TL`,
    { saleId: sale.id },
  )
}
