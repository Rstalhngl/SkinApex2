"use client"

import type { UserNotification } from "@/lib/notification-types"
import { apiFetch } from "@/lib/api-client"

let notifications: UserNotification[] = []
const listeners = new Set<() => void>()

function notify() { listeners.forEach((cb) => cb()) }

export async function syncUserNotifications(_steamId?: string): Promise<void> {
  try {
    const res = await apiFetch("/api/notifications")
    if (!res.ok) return
    const data = await res.json()
    notifications = Array.isArray(data.notifications) ? data.notifications : []
    notify()
  } catch {
    // keep cached notifications on error
  }
}

export async function markUserNotificationsRead(_steamId?: string, ids?: string[]): Promise<void> {
  try {
    await apiFetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    })
    notifications = notifications.map((n) => {
      if (!ids || ids.includes(n.id)) return { ...n, read: true }
      return n
    })
    notify()
  } catch {
    // ignore
  }
}

export function getUserNotifications(): UserNotification[] { return notifications }

export function getUserUnreadCount(): number {
  return notifications.filter((n) => !n.read).length
}

export function subscribeUserNotifications(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
