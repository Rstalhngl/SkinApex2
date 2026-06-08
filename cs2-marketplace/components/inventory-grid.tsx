"use client"

import { memo, useMemo } from "react"
import { ExternalLink, Tag } from "lucide-react"
import type { InventoryItem } from "@/lib/inventory-types"
import type { Skin } from "@/lib/skins"
import { formatPrice } from "@/lib/skins"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const STEAM_IMG_BASE = "https://community.akamai.steamstatic.com/economy/image/"

export function buildMarketPriceMap(marketItems: Skin[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const skin of marketItems) {
    if (skin.marketHashName) map.set(skin.marketHashName, skin.price)
  }
  return map
}

function safeImg(iconUrl: string | undefined): string {
  if (!iconUrl) return "/placeholder.svg"
  if (iconUrl.startsWith("http")) return iconUrl
  return `${STEAM_IMG_BASE}${iconUrl}`
}

function displayName(name: string | undefined): string {
  return (name ?? "").replace("StatTrak™ ", "").replace("Souvenir ", "")
}

interface InventoryGridCardProps {
  item: InventoryItem
  marketPrice: number | null
  onListClick: (item: InventoryItem, refPrice: number | null) => void
  compact?: boolean
}

const InventoryGridCard = memo(function InventoryGridCard({
  item,
  marketPrice,
  onListClick,
  compact = false,
}: InventoryGridCardProps) {
  const { t } = useI18n()
  const name = displayName(item.name)

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-[#243146]",
        compact ? "rounded-lg p-2" : "p-3",
        "[content-visibility:auto] [contain-intrinsic-size:auto_190px]",
      )}
    >
      <div
        className={cn("absolute inset-x-0 top-0 rounded-t-xl", compact ? "h-0.5" : "h-1")}
        style={{ backgroundColor: item.rarityColor ?? "#b0c3d9" }}
      />

      <div className={cn("flex items-center justify-between text-[9px]", compact ? "mb-1" : "mb-1.5 mt-0.5")}>
        <span className="font-semibold" style={{ color: item.rarityColor ?? "#b0c3d9" }}>
          {item.exterior || "—"}
        </span>
        <div className="flex gap-1">
          {item.stattrak && (
            <span className="rounded bg-[#cf6a32]/20 px-1 py-px font-extrabold text-[#cf6a32]">ST™</span>
          )}
          {item.souvenir && (
            <span className="rounded bg-[#ffe400]/20 px-1 py-px font-extrabold text-[#ffe400]">SV</span>
          )}
          {!item.tradable && (
            <span className="rounded bg-destructive/15 px-1 py-px font-bold text-destructive">Kilit</span>
          )}
        </div>
      </div>

      <div className={cn("flex items-center justify-center", compact ? "h-[70px]" : "h-[90px]")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={safeImg(item.img)}
          alt={name}
          className="max-h-full max-w-[90%] object-contain"
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }}
        />
      </div>

      <div className="mt-2 min-w-0">
        <p className="truncate text-[9px] font-bold uppercase text-muted-foreground">{item.type ?? ""}</p>
        <p className="truncate text-[11px] font-semibold leading-tight text-foreground">{name}</p>
        {item.rarity && (
          <p className="text-[9px] font-semibold" style={{ color: item.rarityColor ?? "#b0c3d9" }}>
            {item.rarity}
          </p>
        )}
        {marketPrice != null && (
          <p className="mt-0.5 text-[11px] font-bold text-success">{formatPrice(marketPrice)}</p>
        )}
      </div>

      {item.tradable && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-xl bg-card/96 px-3 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
          <Button
            size="sm"
            onClick={() => onListClick(item, marketPrice)}
            className="h-8 w-full bg-primary text-[10px] font-bold uppercase text-primary-foreground hover:bg-primary/90"
          >
            <Tag className="mr-1.5 h-3.5 w-3.5" />
            {t("sell.list")}
          </Button>
          {item.marketHashName && (
            <a
              href={`https://steamcommunity.com/market/listings/730/${encodeURIComponent(item.marketHashName)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="pointer-events-auto flex h-7 w-full items-center justify-center gap-1.5 rounded-md border border-border bg-input text-[10px] font-semibold text-muted-foreground hover:border-[#66c0f4] hover:text-[#66c0f4]"
            >
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
                <path d="M11.98 0C5.67 0 .5 4.87.02 11.06l6.43 2.66a3.4 3.4 0 0 1 1.92-.59l2.86-4.15v-.06a4.54 4.54 0 1 1 4.54 4.54h-.1l-4.08 2.92.01.4a3.41 3.41 0 0 1-6.76.66L.07 15.4C1.52 20.4 6.32 24 11.98 24 18.62 24 24 18.63 24 12S18.62 0 11.98 0z" />
              </svg>
              Steam
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
      )}
    </div>
  )
})

interface InventoryGridProps {
  items: InventoryItem[]
  marketItems: Skin[]
  onListClick: (item: InventoryItem, refPrice: number | null) => void
  compact?: boolean
  className?: string
}

export function InventoryGrid({
  items,
  marketItems,
  onListClick,
  compact = false,
  className,
}: InventoryGridProps) {
  const priceMap = useMemo(() => buildMarketPriceMap(marketItems), [marketItems])

  return (
    <div
      className={cn(
        "grid gap-3",
        compact
          ? "grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2"
          : "grid-cols-[repeat(auto-fill,minmax(130px,1fr))]",
        className,
      )}
    >
      {items.map((item) => (
        <InventoryGridCard
          key={item.assetId}
          item={item}
          marketPrice={item.marketHashName ? priceMap.get(item.marketHashName) ?? null : null}
          onListClick={onListClick}
          compact={compact}
        />
      ))}
    </div>
  )
}
