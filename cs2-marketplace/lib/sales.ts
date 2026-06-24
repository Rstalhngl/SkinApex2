"use client"

import type { Sale } from "@/lib/sale-types"
import { apiFetch } from "@/lib/api-client"

let salesAsSeller: Sale[] = []
let salesAsBuyer: Sale[] = []
const listeners = new Set<() => void>()

function notify() { listeners.forEach((cb) => cb()) }

export async function syncUserSales(_steamId?: string): Promise<void> {
  try {
    const res = await apiFetch("/api/sales")
    if (!res.ok) return
    const data = await res.json()
    salesAsSeller = Array.isArray(data.salesAsSeller) ? data.salesAsSeller : []
    salesAsBuyer = Array.isArray(data.salesAsBuyer) ? data.salesAsBuyer : []
    notify()
  } catch {
    // keep cache
  }
}

export async function markSaleDelivered(saleId: string): Promise<boolean> {
  try {
    const res = await apiFetch("/api/sales/deliver", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saleId }),
    })
    if (!res.ok) return false
    await syncUserSales()
    return true
  } catch {
    return false
  }
}

export type SaleActionResult = "ok" | "seller_not_delivered" | "failed"

export async function confirmSaleReceived(saleId: string): Promise<SaleActionResult> {
  try {
    const res = await apiFetch("/api/sales/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saleId }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      if (data.error === "seller_not_delivered") return "seller_not_delivered"
      return "failed"
    }
    await syncUserSales()
    return "ok"
  } catch {
    return "failed"
  }
}

export async function disputeSale(saleId: string): Promise<boolean> {
  try {
    const res = await apiFetch("/api/sales/dispute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saleId }),
    })
    if (!res.ok) return false
    await syncUserSales()
    return true
  } catch {
    return false
  }
}

export function getSalesAsSeller(): Sale[] { return salesAsSeller }
export function getSalesAsBuyer(): Sale[] { return salesAsBuyer }
export function getSellerSales(): Sale[] { return salesAsSeller }

export function getPendingDeliveries(): Sale[] {
  return salesAsSeller.filter(
    (s) => s.status === "pending_delivery" && s.deliveryDeadline > Date.now(),
  )
}

export function subscribeSellerSales(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function subscribeUserSales(cb: () => void): () => void {
  return subscribeSellerSales(cb)
}

export function formatDeliveryCountdown(ms: number): string {
  if (ms <= 0) return "Süre doldu"
  const hours = Math.floor(ms / (60 * 60 * 1000))
  const mins = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000))
  const secs = Math.floor((ms % (60 * 1000)) / 1000)
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }
  return `${mins}:${String(secs).padStart(2, "0")}`
}

export function deliveryTimeLeft(sale: Sale): string {
  return formatDeliveryCountdown(sale.deliveryDeadline - Date.now())
}
