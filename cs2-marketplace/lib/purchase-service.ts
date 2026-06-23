import type { PoolClient } from "pg"
import type { Listing } from "@/lib/listing-types"
import type { Sale } from "@/lib/sale-types"
import { DELIVERY_MS } from "@/lib/sale-types"
import { withStoreLock } from "@/lib/data-lock"
import { rejectPendingOffersForListing } from "@/lib/offer-cleanup"
import { readListingsStore, writeListingsStore } from "@/lib/listings-store"
import { readSalesStore, writeSalesStore } from "@/lib/sales-store"
import { debitForPurchase, creditWallet, getWalletBalance, type WalletTxType } from "@/lib/wallet-store"
import { addUserNotification } from "@/lib/notifications-store"
import { isValidTradeUrl, tradeUrlMatchesSteamId } from "@/lib/trade-url"
import { verifyAssetOwnership } from "@/lib/steam-inventory"
import { buildSaleTradeFields } from "@/lib/trade-delivery-service"
import { isTradeBotEnabled } from "@/lib/trade-bot-config"
import { publishPurchaseEvents, publishUserChannel } from "@/lib/ws-publish"
import { isDbEnabled, withTransaction } from "@/lib/db"

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

function validateBuyerTradeUrl(
  buyer: PurchaseBuyer,
): { ok: false; error: string } | null {
  if (!isValidTradeUrl(buyer.tradeUrl)) {
    return { ok: false, error: "invalid_trade_url" }
  }
  if (!tradeUrlMatchesSteamId(buyer.tradeUrl, buyer.steamId)) {
    return { ok: false, error: "trade_url_mismatch" }
  }
  return null
}

async function nextCounterInTx(client: PoolClient, name: string): Promise<number> {
  const res = await client.query<{ value: string }>(
    `UPDATE counters SET value = value + 1 WHERE name = $1 RETURNING value`,
    [name],
  )
  return Number(res.rows[0]?.value ?? 1)
}

async function debitWalletInTx(
  client: PoolClient,
  steamId: string,
  amount: number,
  type: WalletTxType,
  refId?: string,
  note?: string,
): Promise<{ ok: true; balance: number } | { ok: false; error: string }> {
  await client.query(
    `INSERT INTO wallets (steam_id, balance, deposited_balance, withdrawable_balance)
     VALUES ($1, 0, 0, 0) ON CONFLICT DO NOTHING`,
    [steamId],
  )
  const locked = await client.query<{
    balance: string
    deposited_balance: string
    withdrawable_balance: string
  }>(
    `SELECT balance, deposited_balance, withdrawable_balance FROM wallets WHERE steam_id = $1 FOR UPDATE`,
    [steamId],
  )
  const balance = Number(locked.rows[0]?.balance ?? 0)
  const deposited = Number(locked.rows[0]?.deposited_balance ?? 0)
  const withdrawable = Number(locked.rows[0]?.withdrawable_balance ?? 0)
  if (balance < amount) return { ok: false, error: "insufficient_balance" }

  const fromDeposited = Math.min(deposited, amount)
  const fromWithdrawable = Math.round((amount - fromDeposited) * 100) / 100
  const nextDeposited = Math.round((deposited - fromDeposited) * 100) / 100
  const nextWithdrawable = Math.round((withdrawable - fromWithdrawable) * 100) / 100
  const nextBalance = Math.round((balance - amount) * 100) / 100

  await client.query(
    `UPDATE wallets SET balance = $2, deposited_balance = $3, withdrawable_balance = $4
     WHERE steam_id = $1`,
    [steamId, nextBalance, nextDeposited, nextWithdrawable],
  )

  const txNum = await nextCounterInTx(client, "wallet_tx_id")
  await client.query(
    `INSERT INTO wallet_transactions
      (id, steam_id, type, amount, balance_after, ref_id, note, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [`tx-${txNum}`, steamId, type, -amount, nextBalance, refId ?? null, note ?? null, Date.now()],
  )
  return { ok: true, balance: nextBalance }
}

function formatTry(v: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(v)
}

function deliveryHint(buyer: PurchaseBuyer): string {
  return isTradeBotEnabled()
    ? "Teslimat bot tarafından otomatik gönderilecek."
    : `2 saat içinde teslim edin. Alıcı Takas URL: ${buyer.tradeUrl.trim()}`
}

async function notifyPurchaseSideEffects(
  buyer: PurchaseBuyer,
  listing: Listing,
  sale: Sale,
  chargeAmount: number,
): Promise<void> {
  await addUserNotification(
    listing.sellerId,
    "item_sold",
    `Ürününüz satıldı: ${listing.name} — ${formatTry(chargeAmount)}. ${deliveryHint(buyer)}`,
    { saleId: sale.id, listingId: listing.id },
  )
  await rejectPendingOffersForListing(listing.id)
  publishPurchaseEvents({
    buyerId: buyer.steamId,
    sellerId: listing.sellerId,
    itemName: listing.name,
    priceTry: chargeAmount,
    saleId: sale.id,
    listingId: listing.id,
  })
}

function buildSaleRecord(
  saleId: number,
  listing: Listing,
  buyer: PurchaseBuyer,
  chargeAmount: number,
  soldAt: number,
): Sale {
  const netToSeller = Math.round(chargeAmount * (1 - listing.commissionRate))
  return {
    id: `sale-${saleId}`,
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
}

async function completePurchasePg(
  listingId: string,
  buyer: PurchaseBuyer,
  priceTry: number | undefined,
  txType: WalletTxType,
): Promise<PurchaseResult> {
  try {
    const result = await withTransaction(async (client) => {
      const listingRes = await client.query<{ payload: Listing }>(
        `SELECT payload FROM listings
         WHERE id = $1 AND payload->>'status' = 'active'
         FOR UPDATE`,
        [listingId],
      )
      if (!listingRes.rows[0]) return { ok: false as const, error: "listing_not_found" }

      const listing = listingRes.rows[0].payload
      if (listing.sellerId === buyer.steamId) {
        return { ok: false as const, error: "cannot_buy_own_listing" }
      }

      const ownership = await verifyAssetOwnership(listing.sellerId, listing.assetId, { skipCache: true })
      if (!ownership.ok) return { ok: false as const, error: "asset_unavailable" }

      const chargeAmount = priceTry ?? listing.priceTry
      const debit = await debitWalletInTx(client, buyer.steamId, chargeAmount, txType, listingId)
      if (!debit.ok) {
        return { ok: false as const, error: debit.error, minBalance: chargeAmount }
      }

      const soldAt = Date.now()
      const netToSeller = Math.round(chargeAmount * (1 - listing.commissionRate))
      const updatedListing: Listing = {
        ...listing,
        status: "sold",
        soldAt,
        priceTry: chargeAmount,
        netToSeller,
      }

      await client.query(`UPDATE listings SET payload = $2::jsonb WHERE id = $1`, [
        listingId,
        JSON.stringify(updatedListing),
      ])

      const saleNum = await nextCounterInTx(client, "sale_id")
      const sale = buildSaleRecord(saleNum, listing, buyer, chargeAmount, soldAt)
      await client.query(`INSERT INTO sales (id, payload) VALUES ($1, $2::jsonb)`, [
        sale.id,
        JSON.stringify(sale),
      ])

      return { ok: true as const, sale, listing: updatedListing, chargeAmount }
    })

    if (result.ok) {
      await notifyPurchaseSideEffects(buyer, result.listing, result.sale, result.chargeAmount)
      return { ok: true, sale: result.sale, listing: result.listing }
    }
    return result
  } catch {
    return { ok: false, error: "server_error" }
  }
}

async function completeBatchPurchasePg(
  listingIds: string[],
  buyer: PurchaseBuyer,
): Promise<BatchPurchaseResult> {
  const uniqueIds = [...new Set(listingIds)].sort()

  try {
    const result = await withTransaction(async (client) => {
      const resolved: { listing: Listing; charge: number }[] = []

      for (const listingId of uniqueIds) {
        const listingRes = await client.query<{ payload: Listing }>(
          `SELECT payload FROM listings
           WHERE id = $1 AND payload->>'status' = 'active'
           FOR UPDATE`,
          [listingId],
        )
        if (!listingRes.rows[0]) return { ok: false as const, error: "listing_not_found" }

        const listing = listingRes.rows[0].payload
        if (listing.sellerId === buyer.steamId) {
          return { ok: false as const, error: "cannot_buy_own_listing" }
        }

        const ownership = await verifyAssetOwnership(listing.sellerId, listing.assetId, { skipCache: true })
        if (!ownership.ok) return { ok: false as const, error: "asset_unavailable" }

        resolved.push({ listing, charge: listing.priceTry })
      }

      const totalCharge = resolved.reduce((sum, r) => sum + r.charge, 0)
      const debit = await debitWalletInTx(
        client,
        buyer.steamId,
        totalCharge,
        "purchase",
        uniqueIds.join(","),
      )
      if (!debit.ok) {
        return { ok: false as const, error: debit.error, minBalance: totalCharge }
      }

      const soldAt = Date.now()
      const createdSales: Sale[] = []
      const updatedListings: Listing[] = []

      for (const { listing, charge } of resolved) {
        const netToSeller = Math.round(charge * (1 - listing.commissionRate))
        const updatedListing: Listing = {
          ...listing,
          status: "sold",
          soldAt,
          priceTry: charge,
          netToSeller,
        }
        await client.query(`UPDATE listings SET payload = $2::jsonb WHERE id = $1`, [
          listing.id,
          JSON.stringify(updatedListing),
        ])

        const saleNum = await nextCounterInTx(client, "sale_id")
        const sale = buildSaleRecord(saleNum, listing, buyer, charge, soldAt)
        await client.query(`INSERT INTO sales (id, payload) VALUES ($1, $2::jsonb)`, [
          sale.id,
          JSON.stringify(sale),
        ])

        createdSales.push(sale)
        updatedListings.push(updatedListing)
      }

      return { ok: true as const, sales: createdSales, listings: updatedListings }
    })

    if (result.ok) {
      for (let i = 0; i < result.sales.length; i++) {
        await notifyPurchaseSideEffects(
          buyer,
          result.listings[i],
          result.sales[i],
          result.sales[i].priceTry,
        )
      }
      return result
    }
    return result
  } catch {
    return { ok: false, error: "server_error" }
  }
}

export async function completePurchase(
  listingId: string,
  buyer: PurchaseBuyer,
  priceTry?: number,
  txType: "purchase" | "offer_purchase" = "purchase",
): Promise<PurchaseResult> {
  const tradeErr = validateBuyerTradeUrl(buyer)
  if (tradeErr) return tradeErr

  if (isDbEnabled()) {
    return completePurchasePg(listingId, buyer, priceTry, txType)
  }

  return withStoreLock("purchase", async () => {
    const listingsStore = await readListingsStore()
    const idx = listingsStore.listings.findIndex(
      (l) => l.id === listingId && l.status === "active",
    )
    if (idx === -1) return { ok: false, error: "listing_not_found" }

    const listing = listingsStore.listings[idx]
    if (listing.sellerId === buyer.steamId) {
      return { ok: false, error: "cannot_buy_own_listing" }
    }

    const ownership = await verifyAssetOwnership(listing.sellerId, listing.assetId, { skipCache: true })
    if (!ownership.ok) return { ok: false, error: "asset_unavailable" }

    const chargeAmount = priceTry ?? listing.priceTry
    const debit = await debitForPurchase(buyer.steamId, chargeAmount, txType, listingId)
    if (!debit.ok) {
      return { ok: false, error: debit.error, minBalance: chargeAmount }
    }

    const soldAt = Date.now()
    const netToSeller = Math.round(chargeAmount * (1 - listing.commissionRate))
    const updatedListing: Listing = {
      ...listing,
      status: "sold",
      soldAt,
      priceTry: chargeAmount,
      netToSeller,
    }
    listingsStore.listings[idx] = updatedListing

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

    await writeListingsStore(listingsStore)
    await writeSalesStore(salesStore)

    await notifyPurchaseSideEffects(buyer, updatedListing, sale, chargeAmount)

    return { ok: true, sale, listing: updatedListing }
  })
}

export async function completeBatchPurchase(
  listingIds: string[],
  buyer: PurchaseBuyer,
): Promise<BatchPurchaseResult> {
  const tradeErr = validateBuyerTradeUrl(buyer)
  if (tradeErr) return tradeErr

  if (listingIds.length === 0) {
    return { ok: false, error: "empty_cart" }
  }

  if (isDbEnabled()) {
    return completeBatchPurchasePg(listingIds, buyer)
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
      const ownership = await verifyAssetOwnership(listing.sellerId, listing.assetId, { skipCache: true })
      if (!ownership.ok) return { ok: false, error: "asset_unavailable" }
      resolved.push({ idx, listing, charge: listing.priceTry })
    }

    const totalCharge = resolved.reduce((sum, r) => sum + r.charge, 0)
    const balance = await getWalletBalance(buyer.steamId)
    if (balance < totalCharge) {
      return { ok: false, error: "insufficient_balance", minBalance: totalCharge }
    }

    const debit = await debitForPurchase(buyer.steamId, totalCharge, "purchase", uniqueIds.join(","))
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

        await notifyPurchaseSideEffects(buyer, updatedListing, sale, charge)
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
    "Size ayrılan 2 saatlik süre içinde ürünü teslim edemediğiniz için işleminiz iptal edilmiştir.",
    { saleId: sale.id },
  )
}

export async function payoutDeliveredSale(sale: Sale): Promise<void> {
  await creditWallet(sale.sellerId, sale.netToSeller, "sale_payout", sale.id, sale.itemName)
  publishUserChannel("wallet", sale.sellerId)
  await addUserNotification(
    sale.sellerId,
    "item_sold",
    `Satış tamamlandı, bakiyenize eklendi: ${sale.itemName} — ${sale.netToSeller} TL`,
    { saleId: sale.id },
  )
}
