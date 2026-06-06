"use client"

import type { Sale } from "@/lib/sale-types"

let sales: Sale[] = []
const listeners = new Set<() => void>()

function notify() { listeners.forEach((cb) => cb()) }

export async function syncSellerSales(sellerId: string): Promise<void> {
  try {
    const res = await fetch(`/api/sales?sellerId=${encodeURIComponent(sellerId)}`)
    if (!res.ok) return
    const data = await res.json()
    sales = Array.isArray(data.sales) ? data.sales : []
    notify()
  } catch {
    // keep cache
  }
}

export function getSellerSales(): Sale[] { return sales }

export function getPendingDeliveries(): Sale[] {
  return sales.filter((s) => s.status === "pending_delivery" && s.deliveryDeadline > Date.now())
}

export function subscribeSellerSales(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function deliveryTimeLeft(sale: Sale): string {
  const ms = sale.deliveryDeadline - Date.now()
  if (ms <= 0) return "Süre doldu"
  const hours = Math.floor(ms / (60 * 60 * 1000))
  const mins = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000))
  if (hours > 0) return `${hours} saat ${mins} dk`
  return `${mins} dk`
}
