"use client"

import { useEffect, useRef, useState } from "react"
import { Bell, Check, Handshake, PackageCheck, X } from "lucide-react"
import {
  getNotifications, getUnreadCount, markAllRead, markRead,
  subscribeNotifications, type Notification,
} from "@/lib/offers"
import {
  getUserNotifications, getUserUnreadCount, markUserNotificationsRead,
  subscribeUserNotifications,
} from "@/lib/user-notifications"
import type { UserNotification } from "@/lib/notification-types"
import { cn } from "@/lib/utils"
import { useMarket } from "@/components/market-provider"
import { LoginGate } from "@/components/login-gate"
import { useI18n } from "@/lib/i18n"

type DisplayNotification = {
  id: string
  message: string
  createdAt: number
  read: boolean
  source: "offer" | "sale"
  offerType?: Notification["type"]
}

const OFFER_ICON: Record<Notification["type"], React.ReactNode> = {
  offer_received:  <Handshake className="h-3.5 w-3.5 text-primary" />,
  offer_accepted:  <Check className="h-3.5 w-3.5 text-success" />,
  offer_rejected:  <X className="h-3.5 w-3.5 text-destructive" />,
  offer_withdrawn: <X className="h-3.5 w-3.5 text-muted-foreground" />,
}

function mergeNotifications(
  offers: Notification[],
  user: UserNotification[],
): DisplayNotification[] {
  const merged: DisplayNotification[] = [
    ...user.map((n) => ({
      id: `user-${n.id}`,
      message: n.message,
      createdAt: n.createdAt,
      read: n.read,
      source: "sale" as const,
    })),
    ...offers.map((n) => ({
      id: `offer-${n.id}`,
      message: n.message,
      createdAt: n.createdAt,
      read: n.read,
      source: "offer" as const,
      offerType: n.type,
    })),
  ]
  return merged.sort((a, b) => b.createdAt - a.createdAt)
}

function timeAgo(ts: number, t: (k: string, v?: Record<string, string|number>) => string): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return t("notif.justNow")
  if (diff < 3_600_000) return t("notif.minsAgo", { n: Math.floor(diff / 60_000) })
  return t("notif.hoursAgo", { n: Math.floor(diff / 3_600_000) })
}

export function NotificationsBell() {
  const { isLoggedIn, steamProfile } = useMarket()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<DisplayNotification[]>(() =>
    mergeNotifications(getNotifications(), getUserNotifications()),
  )
  const [unread, setUnread] = useState(
    () => getUnreadCount() + getUserUnreadCount(),
  )
  const ref = useRef<HTMLDivElement>(null)

  const refresh = () => {
    setNotifications(mergeNotifications(getNotifications(), getUserNotifications()))
    setUnread(getUnreadCount() + getUserUnreadCount())
  }

  useEffect(() => {
    const unsubOffer = subscribeNotifications(refresh)
    const unsubUser = subscribeUserNotifications(refresh)
    return () => { unsubOffer(); unsubUser() }
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleOpen = () => {
    setOpen((o) => !o)
    if (!open && unread > 0 && steamProfile?.steamId) {
      setTimeout(() => {
        markAllRead()
        void markUserNotificationsRead(steamProfile.steamId)
        refresh()
      }, 1500)
    }
  }

  const handleRead = (n: DisplayNotification) => {
    if (n.source === "offer") {
      markRead(n.id.replace("offer-", ""))
    } else if (steamProfile?.steamId) {
      void markUserNotificationsRead(steamProfile.steamId, [n.id.replace("user-", "")])
    }
    refresh()
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        aria-label={t("notif.title")}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-input text-foreground transition-colors hover:border-primary"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-extrabold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-bold text-foreground">{t("notif.title")}</span>
            {notifications.length > 0 && (
              <button
                onClick={() => {
                  markAllRead()
                  if (steamProfile?.steamId) void markUserNotificationsRead(steamProfile.steamId)
                  refresh()
                }}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                {t("notif.markAll")}
              </button>
            )}
          </div>

          {!isLoggedIn ? (
            <div className="px-1 py-2">
              <LoginGate />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <Bell className="h-8 w-8 opacity-30" />
              <p className="text-xs">{t("notif.empty")}</p>
            </div>
          ) : (
            <ul className="max-h-72 overflow-y-auto divide-y divide-border">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  onClick={() => handleRead(n)}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-input",
                    !n.read && "bg-primary/5",
                  )}
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-input">
                    {n.source === "sale"
                      ? <PackageCheck className="h-3.5 w-3.5 text-success" />
                      : OFFER_ICON[n.offerType ?? "offer_received"]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-xs leading-snug", !n.read ? "text-foreground font-semibold" : "text-muted-foreground")}>
                      {n.message}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground/60">{timeAgo(n.createdAt, t)}</p>
                  </div>
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
