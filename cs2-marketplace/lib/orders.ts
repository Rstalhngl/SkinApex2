"use client"

export type OrderStatus =
  | "escrow"        // Waiting 8-day escrow period
  | "completed"     // Escrow period over, funds released to seller
  | "disputed"      // Buyer opened a support ticket
  | "refunded"      // Admin confirmed issue, buyer refunded
  | "withdrawn"     // Seller withdrew item during escrow

export interface Order {
  id: string
  skinId: number
  skinName: string
  skinImg: string
  exterior: string
  priceTry: number
  boughtAt: number           // unix ms
  escrowReleasesAt: number   // boughtAt + 8 days
  status: OrderStatus
  sellerBannedUntil?: number // unix ms, if seller was penalized
  supportTicketAt?: number
}

const ESCROW_DAYS = 8
const ESCROW_MS = ESCROW_DAYS * 24 * 60 * 60 * 1000
const SELLER_BAN_MS = 7 * 24 * 60 * 60 * 1000 // 1 week ban

let orders: Order[] = []
let nextOrderId = 1
const listeners = new Set<() => void>()

function notify() { listeners.forEach(cb => cb()) }

export function createOrder(
  skin: { id: number; type: string; title: string; img: string; exterior: string },
  priceTry: number,
): Order {
  const now = Date.now()
  const order: Order = {
    id: `order-${nextOrderId++}`,
    skinId: skin.id,
    skinName: `${skin.type} | ${skin.title}`,
    skinImg: skin.img,
    exterior: skin.exterior,
    priceTry,
    boughtAt: now,
    escrowReleasesAt: now + ESCROW_MS,
    status: "escrow",
  }
  orders = [order, ...orders]
  notify()

  // Auto-complete after 8 days (simulated with a timeout — in prod this would be server-side)
  setTimeout(() => autoComplete(order.id), ESCROW_MS)

  return order
}

function autoComplete(orderId: string) {
  orders = orders.map(o => {
    if (o.id === orderId && o.status === "escrow") {
      return { ...o, status: "completed" as OrderStatus }
    }
    return o
  })
  notify()
}

export function openSupportTicket(orderId: string): boolean {
  const order = orders.find(o => o.id === orderId)
  if (!order || order.status !== "escrow") return false
  // Check if within escrow window
  if (Date.now() > order.escrowReleasesAt) return false
  orders = orders.map(o =>
    o.id === orderId ? { ...o, status: "disputed" as OrderStatus, supportTicketAt: Date.now() } : o,
  )
  notify()
  return true
}

export function processRefund(orderId: string): boolean {
  const order = orders.find(o => o.id === orderId)
  if (!order) return false
  orders = orders.map(o =>
    o.id === orderId
      ? { ...o, status: "refunded" as OrderStatus, sellerBannedUntil: Date.now() + SELLER_BAN_MS }
      : o,
  )
  notify()
  return true
}

export function getOrders(): Order[] { return orders }
export function subscribeOrders(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function escrowTimeLeft(order: Order): string {
  const ms = order.escrowReleasesAt - Date.now()
  if (ms <= 0) return "Süresi doldu"
  const days = Math.floor(ms / (24 * 60 * 60 * 1000))
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
  if (days > 0) return `${days} gün ${hours} saat`
  return `${hours} saat`
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  escrow:    "Emanette",
  completed: "Tamamlandı",
  disputed:  "Destek Talebi Açık",
  refunded:  "İade Edildi",
  withdrawn: "Geri Çekildi",
}

export const STATUS_COLOR: Record<OrderStatus, string> = {
  escrow:    "text-yellow-400",
  completed: "text-success",
  disputed:  "text-primary",
  refunded:  "text-destructive",
  withdrawn: "text-muted-foreground",
}
