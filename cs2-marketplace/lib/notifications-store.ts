import { promises as fs } from "fs"
import path from "path"
import type { NotificationsStore, UserNotification } from "@/lib/notification-types"

const DATA_DIR = path.join(process.cwd(), "data")
const DATA_PATH = path.join(DATA_DIR, "notifications.json")

const EMPTY: NotificationsStore = { notifications: [], nextId: 1 }

export async function readNotificationsStore(): Promise<NotificationsStore> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8")
    const parsed = JSON.parse(raw) as NotificationsStore
    if (!Array.isArray(parsed.notifications)) return { ...EMPTY }
    return {
      notifications: parsed.notifications,
      nextId: typeof parsed.nextId === "number" ? parsed.nextId : 1,
    }
  } catch {
    return { ...EMPTY }
  }
}

export async function writeNotificationsStore(store: NotificationsStore): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf-8")
}

export async function addUserNotification(
  steamId: string,
  type: UserNotification["type"],
  message: string,
  extra?: { saleId?: string; listingId?: string },
): Promise<UserNotification> {
  const store = await readNotificationsStore()
  const notification: UserNotification = {
    id: `notif-${store.nextId++}`,
    steamId,
    type,
    message,
    saleId: extra?.saleId,
    listingId: extra?.listingId,
    createdAt: Date.now(),
    read: false,
  }
  store.notifications = [notification, ...store.notifications].slice(0, 200)
  await writeNotificationsStore(store)
  return notification
}

export async function getNotificationsForUser(steamId: string): Promise<UserNotification[]> {
  const store = await readNotificationsStore()
  return store.notifications.filter((n) => n.steamId === steamId)
}

export async function markNotificationsRead(steamId: string, ids?: string[]): Promise<void> {
  const store = await readNotificationsStore()
  store.notifications = store.notifications.map((n) => {
    if (n.steamId !== steamId) return n
    if (!ids || ids.includes(n.id)) return { ...n, read: true }
    return n
  })
  await writeNotificationsStore(store)
}
