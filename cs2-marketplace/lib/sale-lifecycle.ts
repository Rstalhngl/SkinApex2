import type { Sale } from "@/lib/sale-types"
import { readSalesStore, writeSalesStore } from "@/lib/sales-store"
import { refundExpiredSale, payoutDeliveredSale } from "@/lib/purchase-service"

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
  return updated
}
