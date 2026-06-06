"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getActivity, subscribeActivity, type ActivityEvent } from "@/lib/activity-feed"
import { LIVE_SYNC_MS, WS_FALLBACK_SYNC_MS } from "@/lib/live-sync"
import { isWsConnected, subscribeWsActivity, subscribeWsConnection } from "@/lib/ws-client"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

type TickerItem = {
  key: string
  item: string
  action: string
  price: string
}

type ApiActivity = {
  id: string
  item: string
  action: "bought" | "listed"
  price: string
  ts: number
}

const SHOW_MS = 5000
const ANIM_MS = 400

function toTickerItem(
  id: string | number,
  item: string,
  action: "bought" | "listed",
  price: string,
  t: (k: string) => string,
  prefix: string,
): TickerItem {
  return {
    key: `${prefix}-${id}`,
    item,
    action: t(`live.${action}`),
    price,
  }
}

export function LiveTicker() {
  const { t } = useI18n()
  const [display, setDisplay] = useState<TickerItem | null>(null)
  const [entered, setEntered] = useState(false)
  const [exiting, setExiting] = useState(false)

  const seenKeys = useRef(new Set<string>())
  const queue = useRef<TickerItem[]>([])
  const processing = useRef(false)

  const runQueue = useCallback(async () => {
    if (processing.current) return
    processing.current = true

    while (queue.current.length > 0) {
      const item = queue.current.shift()!
      setExiting(false)
      setEntered(false)
      setDisplay(item)

      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      setEntered(true)

      await new Promise((r) => setTimeout(r, SHOW_MS))

      setExiting(true)
      await new Promise((r) => setTimeout(r, ANIM_MS))

      setEntered(false)
      setDisplay(null)
      await new Promise((r) => setTimeout(r, 80))
    }

    processing.current = false
  }, [])

  const enqueue = useCallback((item: TickerItem) => {
    if (seenKeys.current.has(item.key)) return
    seenKeys.current.add(item.key)
    queue.current.push(item)
    void runQueue()
  }, [runQueue])

  const markSeen = useCallback((item: TickerItem) => {
    seenKeys.current.add(item.key)
  }, [])

  useEffect(() => {
    let lastLocalId = 0
    return subscribeActivity(() => {
      const latest = getActivity().find(
        (e) => e.action === "bought" || e.action === "listed",
      )
      if (!latest || latest.id <= lastLocalId) return
      lastLocalId = latest.id
      enqueue(toTickerItem(latest.id, latest.item, latest.action, latest.price, t, "local"))
    })
  }, [enqueue, t])

  useEffect(() => {
    const unsubWs = subscribeWsActivity((e) => {
      if (e.action !== "bought" && e.action !== "listed") return
      enqueue(toTickerItem(e.id, e.item, e.action, e.price, t, "ws"))
    })

    const load = async (initial: boolean) => {
      try {
        const res = await fetch("/api/activity", { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        const events = (Array.isArray(data.events) ? data.events : []) as ApiActivity[]

        for (const e of [...events].reverse()) {
          if (e.action !== "bought" && e.action !== "listed") continue
          const item = toTickerItem(e.id, e.item, e.action, e.price, t, "api")
          if (initial) {
            markSeen(item)
          } else {
            enqueue(item)
          }
        }
      } catch {
        // ignore
      }
    }

    void load(true)

    let interval: ReturnType<typeof setInterval> | null = null
    const startPolling = (wsConnected: boolean) => {
      if (interval) clearInterval(interval)
      interval = setInterval(() => void load(false), wsConnected ? WS_FALLBACK_SYNC_MS : LIVE_SYNC_MS)
    }
    startPolling(isWsConnected())
    const unsubConn = subscribeWsConnection(startPolling)

    return () => {
      unsubWs()
      unsubConn()
      if (interval) clearInterval(interval)
    }
  }, [enqueue, markSeen, t])

  return (
    <div className="relative flex min-h-[36px] items-center gap-4 overflow-hidden border-b border-border bg-[#030712] px-4 py-2 md:px-[4%]">
      <div className="flex shrink-0 items-center gap-1.5 rounded bg-success/15 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-success">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
        </span>
        {t("live.title")}
      </div>

      <div className="relative h-6 min-w-0 flex-1">
        {display && (
          <div
            className={cn(
              "absolute left-0 top-0 max-w-full transition-all ease-out",
              entered && !exiting
                ? "translate-y-0 opacity-100"
                : exiting
                  ? "translate-y-6 opacity-0"
                  : "-translate-y-6 opacity-0",
            )}
            style={{ transitionDuration: `${ANIM_MS}ms` }}
          >
            <span className="block truncate text-xs text-foreground">
              <strong className="font-semibold text-primary">{display.item}</strong>{" "}
              <span className="text-muted-foreground">{display.action}</span>{" "}
              <span className="font-bold text-success">{display.price}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
