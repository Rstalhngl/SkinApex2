import { promises as fs } from "fs"
import path from "path"
import type { NotificationsStore, UserNotification } from "@/lib/notification-types"
import { bumpCounter, getCounter, isDbEnabled, query, setCounter } from "@/lib/db"
import { publishUserChannel } from "@/lib/ws-publish"
import { sendAdminEmail, sendUserEmail } from "@/lib/email-service"
import { buildEmailSubject } from "@/lib/email-subjects"

const DATA_DIR = path.join(process.cwd(), "data")
const DATA_PATH = path.join(DATA_DIR, "notifications.json")

const EMPTY: NotificationsStore = { notifications: [], nextId: 1 }

async function readNotificationsStoreJson(): Promise<NotificationsStore> {
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

async function readNotificationsStorePg(): Promise<NotificationsStore> {
  const [rows, nextId] = await Promise.all([
    query<{ payload: UserNotification }>(
      "SELECT payload FROM notifications ORDER BY (payload->>'createdAt')::bigint DESC LIMIT 200",
    ),
    getCounter("notification_id"),
  ])
  return {
    notifications: rows.rows.map((r) => r.payload),
    nextId,
  }
}

async function writeNotificationsStoreJson(store: NotificationsStore): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf-8")
}

async function writeNotificationsStorePg(store: NotificationsStore): Promise<void> {
  await setCounter("notification_id", store.nextId)
  for (const n of store.notifications) {
    await query(
      `INSERT INTO notifications (id, payload) VALUES ($1, $2::jsonb)
       ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload`,
      [n.id, JSON.stringify(n)],
    )
  }
}

export async function readNotificationsStore(): Promise<NotificationsStore> {
  if (isDbEnabled()) return readNotificationsStorePg()
  return readNotificationsStoreJson()
}

export async function writeNotificationsStore(store: NotificationsStore): Promise<void> {
  if (isDbEnabled()) return writeNotificationsStorePg(store)
  return writeNotificationsStoreJson(store)
}

export async function addUserNotification(
  steamId: string,
  type: UserNotification["type"],
  message: string,
  extra?: { saleId?: string; listingId?: string; emailSubject?: string },
): Promise<UserNotification> {
  const emailSubject = extra?.emailSubject ?? buildEmailSubject(type, message)
  if (isDbEnabled()) {
    const num = await bumpCounter("notification_id")
    const notification: UserNotification = {
      id: `notif-${num}`,
      steamId,
      type,
      message,
      saleId: extra?.saleId,
      listingId: extra?.listingId,
      createdAt: Date.now(),
      read: false,
    }
    await query(
      `INSERT INTO notifications (id, payload) VALUES ($1, $2::jsonb)`,
      [notification.id, JSON.stringify(notification)],
    )
    publishUserChannel("notifications", steamId)
    void sendUserEmail(steamId, emailSubject, message)
    return notification
  }

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
  publishUserChannel("notifications", steamId)
  void sendUserEmail(steamId, emailSubject, message)
  return notification
}

export async function getNotificationsForUser(steamId: string): Promise<UserNotification[]> {
  if (isDbEnabled()) {
    const res = await query<{ payload: UserNotification }>(
      `SELECT payload FROM notifications
       WHERE payload->>'steamId' = $1
       ORDER BY (payload->>'createdAt')::bigint DESC LIMIT 50`,
      [steamId],
    )
    return res.rows.map((r) => r.payload)
  }
  const store = await readNotificationsStore()
  return store.notifications.filter((n) => n.steamId === steamId)
}

export async function markNotificationsRead(steamId: string, ids?: string[]): Promise<void> {
  if (isDbEnabled()) {
    const rows = await query<{ id: string; payload: UserNotification }>(
      `SELECT id, payload FROM notifications WHERE payload->>'steamId' = $1`,
      [steamId],
    )
    for (const row of rows.rows) {
      if (ids && !ids.includes(row.id)) continue
      const updated = { ...row.payload, read: true }
      await query(
        `UPDATE notifications SET payload = $2::jsonb WHERE id = $1`,
        [row.id, JSON.stringify(updated)],
      )
    }
    return
  }

  const store = await readNotificationsStore()
  store.notifications = store.notifications.map((n) => {
    if (n.steamId !== steamId) return n
    if (!ids || ids.includes(n.id)) return { ...n, read: true }
    return n
  })
  await writeNotificationsStore(store)
}
