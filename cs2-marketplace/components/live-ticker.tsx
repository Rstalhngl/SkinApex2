"use client"

import { useEffect, useState } from "react"
import { liveSalesPool } from "@/lib/skins"
import { getActivity, subscribeActivity, type ActivityEvent } from "@/lib/activity-feed"
import { useI18n } from "@/lib/i18n"

// Build display items from real activity + fallback pool
function buildTickerItems(events: ActivityEvent[], t: (k: string) => string) {
  if (events.length >= 5) {
    // Enough real events — show only them (most recent first)
    return events.slice(0, 20).map((e) => ({
      key: `e-${e.id}`,
      item: e.item,
      action: t(`live.${e.action}`),
      price: e.price,
    }))
  }

  // Not enough real events yet — pad with pool items
  const poolItems = [...liveSalesPool, ...liveSalesPool].map((s, i) => ({
    key: `p-${i}`,
    item: s.item,
    action: t(`live.${s.action}`),
    price: s.price,
  }))

  const realItems = events.map((e) => ({
    key: `e-${e.id}`,
    item: e.item,
    action: t(`live.${e.action}`),
    price: e.price,
  }))

  return [...realItems, ...poolItems]
}

export function LiveTicker() {
  const { t } = useI18n()
  const [events, setEvents] = useState<ActivityEvent[]>(() => getActivity())

  useEffect(() => {
    const unsub = subscribeActivity(() => setEvents([...getActivity()]))
    return unsub
  }, [])

  const items = buildTickerItems(events, t)

  // Double items for seamless loop
  const display = [...items, ...items]

  return (
    <div className="flex items-center gap-4 border-b border-border bg-[#030712] px-4 py-2 md:px-[4%]">
      <div className="flex shrink-0 items-center gap-1.5 rounded bg-success/15 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-success">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
        </span>
        {t("live.title")}
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div className="flex w-max animate-ticker gap-10">
          {display.map((item, i) => (
            <span key={`${item.key}-${i}`} className="whitespace-nowrap text-xs text-foreground">
              <strong className="font-semibold text-primary">{item.item}</strong>{" "}
              <span className="text-muted-foreground">{item.action}</span>{" "}
              <span className="font-bold text-success">{item.price}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
