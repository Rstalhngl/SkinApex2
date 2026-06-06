"use client"

import type { UserNotification } from "@/lib/notification-types"

let notifications: UserNotification[] = []
const listeners = new Set<() => void>()

function notify() { listeners.forEach((cb) => cb()) }

export async function syncUserNotifications(steamId: string): Promise<void> {
  try {
    const res = await fetch(`/api/notifications?steamId=${encodeURIComponent(steamId)}`)
    if (!res.ok) return
    const data = await res.json()
    notifications = Array.isArray(data.notifications) ? data.notifications : []
    notify()
  } catch {
    // keep cached notifications on error
  }
}

export async function markUserNotificationsRead(steamId: string, ids?: string[]): Promise<void> {
  try {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ steamId, ids }),
    })
    notifications = notifications.map((n) => {
      if (n.steamId !== steamId) return n
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
