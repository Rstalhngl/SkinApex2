import type { Sale, SaleResolution } from "@/lib/sale-types"
import { getAdminSteamIds } from "@/lib/admin-auth"
import { LISTING_BAN_MS } from "@/lib/app-config"
import { addUserNotification } from "@/lib/notifications-store"
import { creditWallet } from "@/lib/wallet-store"
import { payoutDeliveredSale } from "@/lib/purchase-service"
import { getDisputedSales, patchSale } from "@/lib/sales-store"
import { readSalesStore } from "@/lib/sales-store"
import { publishUserChannel } from "@/lib/ws-publish"
import { getActiveUserStats } from "@/lib/active-users"
import { getActiveListingsFromStore } from "@/lib/listings-store"
import { clearListingBan, listActiveListingBans, setListingBan } from "@/lib/moderation-store"
import { sendAdminEmail } from "@/lib/email-service"
import { buildAdminEmailSubject } from "@/lib/email-subjects"
import {
  countOpenWithdrawals,
  getWithdrawalById,
  updateWithdrawalStatus,
  type WithdrawalRequest,
} from "@/lib/withdraw-store"

export async function notifyAdmins(message: string, extra?: { saleId?: string }): Promise<void> {
  const emailSubject = buildAdminEmailSubject(message)
  for (const steamId of getAdminSteamIds()) {
    await addUserNotification(steamId, "item_sold", message, { ...extra, emailSubject })
  }
  void sendAdminEmail(emailSubject, message)
}

export async function getAdminOverview() {
  const [store, active, listings, openWithdrawals] = await Promise.all([
    readSalesStore(),
    getActiveUserStats(),
    getActiveListingsFromStore(),
    countOpenWithdrawals(),
  ])
  const sales = store.sales
  return {
    totalSales: sales.length,
    pendingDelivery: sales.filter((s) => s.status === "pending_delivery").length,
    disputed: sales.filter((s) => s.status === "disputed").length,
    delivered: sales.filter((s) => s.status === "delivered").length,
    expired: sales.filter((s) => s.status === "expired").length,
    resolved: sales.filter((s) => s.status === "resolved").length,
    activeListings: listings.length,
    activeUsers: active.activeUsers,
    wsConnections: active.wsConnections,
    openWithdrawals,
  }
}

export type ResolveAction = "buyer_refund" | "seller_paid"

export async function resolveDispute(
  saleId: string,
  action: ResolveAction,
  adminSteamId: string,
  note?: string,
): Promise<Sale | null> {
  const disputed = await getDisputedSales()
  const sale = disputed.find((s) => s.id === saleId)
  if (!sale || sale.status !== "disputed") return null

  const resolution: SaleResolution = action
  const updated: Sale = {
    ...sale,
    status: "resolved",
    resolution,
    adminNote: note?.trim() || undefined,
    resolvedAt: Date.now(),
    resolvedBy: adminSteamId,
  }

  if (action === "buyer_refund") {
    await creditWallet(sale.buyerId, sale.priceTry, "refund", sale.id, "Admin: destek iadesi")
    await setListingBan(sale.sellerId, Date.now() + LISTING_BAN_MS)
    await addUserNotification(
      sale.buyerId,
      "item_sold",
      `Destek talebiniz onaylandı, iade yapıldı: ${sale.itemName} — ${sale.priceTry} TL`,
      { saleId: sale.id },
    )
    await addUserNotification(
      sale.sellerId,
      "item_sold",
      `Destek talebi alıcı lehine sonuçlandı: ${sale.itemName}. 1 hafta ilan açamazsınız.`,
      { saleId: sale.id },
    )
  } else {
    await payoutDeliveredSale(sale)
    await addUserNotification(
      sale.sellerId,
      "item_sold",
      `Destek talebi satıcı lehine sonuçlandı: ${sale.itemName} — ${sale.netToSeller} TL`,
      { saleId: sale.id },
    )
    await addUserNotification(
      sale.buyerId,
      "item_sold",
      `Destek talebiniz incelendi: ${sale.itemName}. Karar satıcı lehine.`,
      { saleId: sale.id },
    )
  }

  await patchSale(updated)
  publishUserChannel("sales", sale.buyerId)
  publishUserChannel("sales", sale.sellerId)
  if (action === "buyer_refund") {
    publishUserChannel("wallet", sale.buyerId)
  }
  return updated
}

export type WithdrawResolveAction = "processing" | "complete" | "reject"

export async function resolveWithdrawal(
  requestId: string,
  action: WithdrawResolveAction,
  _adminSteamId: string,
  rejectReason?: string,
): Promise<WithdrawalRequest | null> {
  const req = await getWithdrawalById(requestId)
  if (!req) return null

  if (action === "processing") {
    if (req.status !== "pending") return null
    return updateWithdrawalStatus(requestId, { status: "processing" })
  }

  if (action === "complete") {
    if (req.status !== "pending" && req.status !== "processing") return null
    const updated = await updateWithdrawalStatus(requestId, {
      status: "completed",
      processedAt: Date.now(),
    })
    await addUserNotification(
      req.steamId,
      "item_sold",
      `Para çekme talebiniz tamamlandı: ${req.amount} TL — ${req.iban}`,
      { saleId: req.id },
    )
    publishUserChannel("wallet", req.steamId)
    return updated
  }

  if (action === "reject") {
    if (req.status !== "pending" && req.status !== "processing") return null
    const reason = rejectReason?.trim() || "Çekim talebi reddedildi"
    const credit = await creditWallet(
      req.steamId,
      req.amount,
      "sale_payout",
      req.id,
      `Admin: ${reason}`,
    )
    if (!credit.ok) return null
    const updated = await updateWithdrawalStatus(requestId, {
      status: "rejected",
      processedAt: Date.now(),
      rejectReason: reason,
    })
    await addUserNotification(
      req.steamId,
      "item_sold",
      `Para çekme talebiniz reddedildi: ${req.amount} TL bakiyenize iade edildi. ${reason}`,
      { saleId: req.id },
    )
    publishUserChannel("wallet", req.steamId)
    return updated
  }

  return null
}

export async function getPendingDeliverySales(limit = 30): Promise<Sale[]> {
  const store = await readSalesStore()
  return store.sales
    .filter((s) => s.status === "pending_delivery")
    .sort((a, b) => b.soldAt - a.soldAt)
    .slice(0, limit)
}

export async function getModerationBans() {
  return listActiveListingBans()
}

export async function banUserFromListing(steamId: string, days = 7): Promise<void> {
  await setListingBan(steamId, Date.now() + days * 24 * 60 * 60 * 1000)
}

export async function unbanUserFromListing(steamId: string): Promise<void> {
  await clearListingBan(steamId)
}
