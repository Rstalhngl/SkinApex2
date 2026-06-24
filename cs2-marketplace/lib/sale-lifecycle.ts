import type { Sale } from "@/lib/sale-types"
import { DELIVERY_REMINDER_BEFORE_MS } from "@/lib/sale-types"
import { readSalesStore, writeSalesStore } from "@/lib/sales-store"
import { notifyAdmins } from "@/lib/admin-service"
import { refundExpiredSale, payoutDeliveredSale } from "@/lib/purchase-service"
import { addUserNotification } from "@/lib/notifications-store"
import { publishUserChannel } from "@/lib/ws-publish"
import { isTradeBotEnabled } from "@/lib/trade-bot-config"

/** Auto-expire pending deliveries past deadline. Returns count expired. */
export async function processExpiredSales(): Promise<number> {
  const store = await readSalesStore()
  const now = Date.now()
  let changed = false
  let expired = 0

  for (let i = 0; i < store.sales.length; i++) {
    const sale = store.sales[i]
    if (sale.status === "pending_delivery" && sale.deliveryDeadline <= now) {
      store.sales[i] = { ...sale, status: "expired" }
      changed = true
      expired++
      await refundExpiredSale(sale)
    }
  }

  if (changed) await writeSalesStore(store)
  return expired
}

/** Remind sellers ~30 min before delivery deadline (P2P mode only). */
export async function processDeliveryReminders(): Promise<number> {
  if (isTradeBotEnabled()) return 0

  const store = await readSalesStore()
  const now = Date.now()
  let changed = false
  let sent = 0

  for (let i = 0; i < store.sales.length; i++) {
    const sale = store.sales[i]
    if (sale.status !== "pending_delivery") continue
    if (sale.deliveredAt || sale.deliveryReminderSentAt) continue
    if (sale.deliveryDeadline <= now) continue

    const msLeft = sale.deliveryDeadline - now
    if (msLeft > DELIVERY_REMINDER_BEFORE_MS) continue

    const minsLeft = Math.max(1, Math.round(msLeft / 60_000))
    await addUserNotification(
      sale.sellerId,
      "delivery_reminder",
      `Teslimat için ${minsLeft} dk kaldı: ${sale.itemName}. Alıcının Takas URL'si kayıtlı.`,
      { saleId: sale.id },
    )
    store.sales[i] = { ...sale, deliveryReminderSentAt: now }
    changed = true
    sent++
    publishUserChannel("sales", sale.sellerId)
  }

  if (changed) await writeSalesStore(store)
  return sent
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
  if (sale.deliveredAt) return sale

  const updated: Sale = { ...sale, deliveredAt: Date.now() }
  store.sales[idx] = updated
  await writeSalesStore(store)

  await addUserNotification(
    sale.buyerId,
    "item_sold",
    `Satıcı teslim ettiğini bildirdi: ${sale.itemName}. Lütfen kontrol edip onaylayın veya destek talebi açın.`,
    { saleId: sale.id },
  )
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
  if (sale.status !== "pending_delivery") return null
  if (sale.deliveryDeadline <= Date.now()) return null
  if (!sale.deliveredAt) return null

  const updated: Sale = {
    ...sale,
    status: "delivered",
    confirmedAt: Date.now(),
  }
  store.sales[idx] = updated
  await writeSalesStore(store)

  await payoutDeliveredSale(updated)
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
