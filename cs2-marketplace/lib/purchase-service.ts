import type { Listing } from "@/lib/listing-types"
import type { Sale } from "@/lib/sale-types"
import { DELIVERY_MS } from "@/lib/sale-types"
import { withStoreLock } from "@/lib/data-lock"
import { rejectPendingOffersForListing } from "@/lib/offer-cleanup"
import { readListingsStore, writeListingsStore } from "@/lib/listings-store"
import { readSalesStore, writeSalesStore } from "@/lib/sales-store"
import { debitWallet, creditWallet, getWalletBalance } from "@/lib/wallet-store"
import { addUserNotification } from "@/lib/notifications-store"
import { isValidTradeUrl } from "@/lib/trade-url"
import { buildSaleTradeFields } from "@/lib/trade-delivery-service"
import { isTradeBotEnabled } from "@/lib/trade-bot-config"

export interface PurchaseBuyer {
  steamId: string
  steamName: string | null
  tradeUrl: string
}

export type PurchaseResult =
  | { ok: true; sale: Sale; listing: Listing }
  | { ok: false; error: string; minBalance?: number }

export type BatchPurchaseResult =
  | { ok: true; sales: Sale[]; listings: Listing[] }
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
    ...buildSaleTradeFields(listing.assetId),
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

  const deliveryHint = isTradeBotEnabled()
    ? "Teslimat bot tarafından otomatik gönderilecek."
    : `2 saat içinde teslim edin. Alıcı Takas URL: ${buyer.tradeUrl.trim()}`

  await addUserNotification(
    listing.sellerId,
    "item_sold",
    `Ürününüz satıldı: ${listing.name} — ${fmt(chargeAmount)}. ${deliveryHint}`,
    { saleId: sale.id, listingId: listing.id },
  )

  await rejectPendingOffersForListing(listing.id)

  return { ok: true, sale, listing: updatedListing }
}

export async function completeBatchPurchase(
  listingIds: string[],
  buyer: PurchaseBuyer,
): Promise<BatchPurchaseResult> {
  if (!isValidTradeUrl(buyer.tradeUrl)) {
    return { ok: false, error: "invalid_trade_url" }
  }
  if (listingIds.length === 0) {
    return { ok: false, error: "empty_cart" }
  }

  return withStoreLock("purchase", async () => {
    const uniqueIds = [...new Set(listingIds)]
    const listingsStore = await readListingsStore()
    const resolved: { idx: number; listing: Listing; charge: number }[] = []

    for (const listingId of uniqueIds) {
      const idx = listingsStore.listings.findIndex(
        (l) => l.id === listingId && l.status === "active",
      )
      if (idx === -1) return { ok: false, error: "listing_not_found" }
      const listing = listingsStore.listings[idx]
      if (listing.sellerId === buyer.steamId) {
        return { ok: false, error: "cannot_buy_own_listing" }
      }
      resolved.push({ idx, listing, charge: listing.priceTry })
    }

    const totalCharge = resolved.reduce((sum, r) => sum + r.charge, 0)
    const balance = await getWalletBalance(buyer.steamId)
    if (balance < totalCharge) {
      return { ok: false, error: "insufficient_balance", minBalance: totalCharge }
    }

    const debit = await debitWallet(buyer.steamId, totalCharge, "purchase", uniqueIds.join(","))
    if (!debit.ok) {
      return { ok: false, error: debit.error, minBalance: totalCharge }
    }

    const salesStore = await readSalesStore()
    const createdSales: Sale[] = []
    const updatedListings: Listing[] = []
    const soldAt = Date.now()

    try {
      for (const { idx, listing, charge } of resolved) {
        const netToSeller = Math.round(charge * (1 - listing.commissionRate))
        const updatedListing: Listing = {
          ...listing,
          status: "sold",
          soldAt,
          priceTry: charge,
          netToSeller,
        }
        listingsStore.listings[idx] = updatedListing
        updatedListings.push(updatedListing)

        const sale: Sale = {
          id: `sale-${salesStore.nextId++}`,
          listingId: listing.id,
          ...buildSaleTradeFields(listing.assetId),
          sellerId: listing.sellerId,
          sellerName: listing.sellerName,
          buyerId: buyer.steamId,
          buyerName: buyer.steamName ?? buyer.steamId,
          itemName: listing.name,
          itemImg: listing.img,
          exterior: listing.exterior,
          priceTry: charge,
          netToSeller,
          soldAt,
          deliveryDeadline: soldAt + DELIVERY_MS,
          status: "pending_delivery",
          buyerTradeUrl: buyer.tradeUrl.trim(),
        }
        salesStore.sales = [sale, ...salesStore.sales]
        createdSales.push(sale)

        const fmt = (v: number) =>
          new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(v)

        const deliveryHint = isTradeBotEnabled()
          ? "Teslimat bot tarafından otomatik gönderilecek."
          : `2 saat içinde teslim edin. Alıcı Takas URL: ${buyer.tradeUrl.trim()}`

        await addUserNotification(
          listing.sellerId,
          "item_sold",
          `Ürününüz satıldı: ${listing.name} — ${fmt(charge)}. ${deliveryHint}`,
          { saleId: sale.id, listingId: listing.id },
        )
        await rejectPendingOffersForListing(listing.id)
      }

      await writeListingsStore(listingsStore)
      await writeSalesStore(salesStore)
      return { ok: true, sales: createdSales, listings: updatedListings }
    } catch {
      await creditWallet(buyer.steamId, totalCharge, "refund", undefined, "Toplu satın alma geri alındı")
      return { ok: false, error: "server_error" }
    }
  })
}

export async function refundDisputedSale(sale: Sale): Promise<void> {
  await creditWallet(sale.buyerId, sale.priceTry, "refund", sale.id, "Destek talebi iadesi")
  await addUserNotification(
    sale.buyerId,
    "item_sold",
    `Destek talebi iadesi: ${sale.itemName} — ${sale.priceTry} TL`,
    { saleId: sale.id },
  )
  await addUserNotification(
    sale.sellerId,
    "item_sold",
    `Destek talebi açıldı: ${sale.itemName}. Alıcıya iade yapıldı.`,
    { saleId: sale.id },
  )
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
