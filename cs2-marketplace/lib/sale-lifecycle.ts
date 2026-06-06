import type { Sale } from "@/lib/sale-types"
import { readSalesStore, writeSalesStore } from "@/lib/sales-store"
import { notifyAdmins } from "@/lib/admin-service"
import { refundExpiredSale, payoutDeliveredSale } from "@/lib/purchase-service"
import { addUserNotification } from "@/lib/notifications-store"
import { publishUserChannel } from "@/lib/ws-publish"

/** Auto-expire pending deliveries past deadline; returns updated sales. */
export async function processExpiredSales(): Promise<void> {
  const store = await readSalesStore()
  const now = Date.now()
  let changed = false

  for (let i = 0; i < store.sales.length; i++) {
    const sale = store.sales[i]
    if (sale.status === "pending_delivery" && sale.deliveryDeadline <= now) {
      store.sales[i] = { ...sale, status: "expired" }
      changed = true
      await refundExpiredSale(sale)
    }
  }

  if (changed) await writeSalesStore(store)
}

/** Called by trade bot when Steam reports offer accepted. */
export async function markSaleDeliveredByBot(saleId: string): Promise<Sale | null> {
  const store = await readSalesStore()
  const idx = store.sales.findIndex((s) => s.id === saleId)
  if (idx === -1) return null

  const sale = store.sales[idx]
  if (sale.status !== "pending_delivery") return null
  if (sale.deliveryDeadline <= Date.now()) return null

  const updated: Sale = {
    ...sale,
    status: "delivered",
    deliveredAt: Date.now(),
    tradeOfferState: "accepted",
    tradeOfferUpdatedAt: Date.now(),
  }
  store.sales[idx] = updated
  await writeSalesStore(store)

  await payoutDeliveredSale(updated)
  publishUserChannel("sales", sale.buyerId)
  publishUserChannel("sales", sale.sellerId)
  await addUserNotification(
    sale.buyerId,
    "item_sold",
    `Teslimat tamamlandı (Steam takas): ${sale.itemName}`,
    { saleId: sale.id },
  )
  return updated
}

export async function markSaleDelivered(saleId: string, sellerId: string): Promise<Sale | null> {
  const store = await readSalesStore()
  const idx = store.sales.findIndex((s) => s.id === saleId)
  if (idx === -1) return null

  const sale = store.sales[idx]
  if (sale.sellerId !== sellerId) return null
  if (sale.status !== "pending_delivery") return null
  if (sale.deliveryDeadline <= Date.now()) return null

  const updated: Sale = { ...sale, status: "delivered", deliveredAt: Date.now() }
  store.sales[idx] = updated
  await writeSalesStore(store)

  await payoutDeliveredSale(updated)
  publishUserChannel("sales", sale.sellerId)
  publishUserChannel("sales", sale.buyerId)
  return updated
}

export async function confirmSaleReceived(saleId: string, buyerId: string): Promise<Sale | null> {
  const store = await readSalesStore()
  const idx = store.sales.findIndex((s) => s.id === saleId)
  if (idx === -1) return null

  const sale = store.sales[idx]
  if (sale.buyerId !== buyerId) return null
  if (sale.status !== "pending_delivery" && sale.status !== "delivered") return null

  const updated: Sale = {
    ...sale,
    status: "delivered",
    deliveredAt: sale.deliveredAt ?? Date.now(),
    confirmedAt: Date.now(),
  }
  store.sales[idx] = updated
  await writeSalesStore(store)

  if (sale.status === "pending_delivery" && !sale.deliveredAt) {
    await payoutDeliveredSale(updated)
  }
  publishUserChannel("sales", sale.buyerId)
  publishUserChannel("sales", sale.sellerId)
  return updated
}

export async function disputeSale(saleId: string, buyerId: string): Promise<Sale | null> {
  const store = await readSalesStore()
  const idx = store.sales.findIndex((s) => s.id === saleId)
  if (idx === -1) return null

  const sale = store.sales[idx]
  if (sale.buyerId !== buyerId) return null
  if (sale.status !== "pending_delivery") return null
  if (sale.deliveryDeadline <= Date.now()) return null

  const updated: Sale = { ...sale, status: "disputed", disputedAt: Date.now() }
  store.sales[idx] = updated
  await writeSalesStore(store)

  await addUserNotification(
    sale.buyerId,
    "item_sold",
    `Destek talebiniz alındı, inceleniyor: ${sale.itemName}`,
    { saleId: sale.id },
  )
  await addUserNotification(
    sale.sellerId,
    "item_sold",
    `Alıcı destek talebi açtı: ${sale.itemName}. Admin incelemesi bekleniyor.`,
    { saleId: sale.id },
  )
  await notifyAdmins(
    `Yeni destek talebi: ${sale.itemName} — ${sale.priceTry} TL (Satış: ${sale.id})`,
    { saleId: sale.id },
  )
  publishUserChannel("sales", sale.buyerId)
  publishUserChannel("sales", sale.sellerId)

  return updated
}
