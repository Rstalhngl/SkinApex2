import type { Sale, SaleResolution } from "@/lib/sale-types"
import { getAdminSteamIds } from "@/lib/admin-auth"
import { addUserNotification } from "@/lib/notifications-store"
import { creditWallet } from "@/lib/wallet-store"
import { payoutDeliveredSale } from "@/lib/purchase-service"
import { getDisputedSales, patchSale } from "@/lib/sales-store"
import { readSalesStore } from "@/lib/sales-store"
import { publishUserChannel } from "@/lib/ws-publish"

export async function notifyAdmins(message: string, extra?: { saleId?: string }): Promise<void> {
  for (const steamId of getAdminSteamIds()) {
    await addUserNotification(steamId, "item_sold", message, extra)
  }
}

export async function getAdminOverview() {
  const store = await readSalesStore()
  const sales = store.sales
  return {
    totalSales: sales.length,
    pendingDelivery: sales.filter((s) => s.status === "pending_delivery").length,
    disputed: sales.filter((s) => s.status === "disputed").length,
    delivered: sales.filter((s) => s.status === "delivered").length,
    expired: sales.filter((s) => s.status === "expired").length,
    resolved: sales.filter((s) => s.status === "resolved").length,
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
    await addUserNotification(
      sale.buyerId,
      "item_sold",
      `Destek talebiniz onaylandı, iade yapıldı: ${sale.itemName} — ${sale.priceTry} TL`,
      { saleId: sale.id },
    )
    await addUserNotification(
      sale.sellerId,
      "item_sold",
      `Destek talebi alıcı lehine sonuçlandı: ${sale.itemName}`,
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
