"use client"

import { useEffect, useRef, useState } from "react"
import { Bell, Check, Handshake, X } from "lucide-react"
import {
  getNotifications, getUnreadCount, markAllRead, markRead,
  subscribeNotifications, type Notification,
} from "@/lib/offers"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n"

const TYPE_ICON: Record<Notification["type"], React.ReactNode> = {
  offer_received:  <Handshake className="h-3.5 w-3.5 text-primary" />,
  offer_accepted:  <Check className="h-3.5 w-3.5 text-success" />,
  offer_rejected:  <X className="h-3.5 w-3.5 text-destructive" />,
  offer_withdrawn: <X className="h-3.5 w-3.5 text-muted-foreground" />,
}

function timeAgo(ts: number, t: (k: string, v?: Record<string, string|number>) => string): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return t("notif.justNow")
  if (diff < 3_600_000) return t("notif.minsAgo", { n: Math.floor(diff / 60_000) })
  return t("notif.hoursAgo", { n: Math.floor(diff / 3_600_000) })
}

export function NotificationsBell() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>(() => getNotifications())
  const [unread, setUnread] = useState(() => getUnreadCount())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return subscribeNotifications(() => {
      setNotifications([...getNotifications()])
      setUnread(getUnreadCount())
    })
  }, [])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleOpen = () => {
    setOpen(o => !o)
    if (!open && unread > 0) {
      setTimeout(markAllRead, 1500)
    }
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
              <button onClick={markAllRead} className="text-[11px] text-muted-foreground hover:text-foreground">
                {t("notif.markAll")}
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <Bell className="h-8 w-8 opacity-30" />
              <p className="text-xs">{t("notif.empty")}</p>
            </div>
          ) : (
            <ul className="max-h-72 overflow-y-auto divide-y divide-border">
              {notifications.map(n => (
                <li
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-input",
                    !n.read && "bg-primary/5",
                  )}
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-input">
                    {TYPE_ICON[n.type]}
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
