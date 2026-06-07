"use client"

/**
 * inventory-sheet.tsx
 * Defensive rewrite — null-safe, no infinite loops, no nested Radix modals.
 */

import { useEffect, useRef, useState } from "react"
import {
  ExternalLink,
  Lock,
  Package,
  RefreshCw,
  Tag,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useMarket } from "@/components/market-provider"
import { useI18n } from "@/lib/i18n"
import { formatPrice } from "@/lib/skins"
import { createListingWithError } from "@/lib/listings"
import { listingErrorMessage } from "@/lib/listing-errors"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ─── Types ─────────────────────────────────────────────────────────────────────

import type { InventoryItem } from "@/lib/inventory-types"

type ApiResponse =
  | { items: InventoryItem[]; total: number; error?: undefined }
  | { items: []; error: string }

const COMMISSION = 0.07
const STEAM_IMG_BASE = "https://community.akamai.steamstatic.com/economy/image/"

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatTry(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value)
}

/** Safely get market price for an item. Never throws. */
function getMarketPrice(
  marketHashName: string | undefined,
  skins: import("@/lib/skins").Skin[],
): number | null {
  if (!marketHashName) return null
  return skins.find((s) => s.marketHashName === marketHashName)?.price ?? null
}

/** Safely build Steam CDN image URL */
function safeImg(iconUrl: string | undefined): string {
  if (!iconUrl) return "/placeholder.svg"
  if (iconUrl.startsWith("http")) return iconUrl
  return `${STEAM_IMG_BASE}${iconUrl}`
}

// ─── ListingDialog ─────────────────────────────────────────────────────────────
// IMPORTANT: rendered as a SIBLING of <Sheet>, never inside SheetContent.
// Nesting Radix Dialog inside Sheet creates overlapping focus-traps that
// lock pointer-events on the body.

interface ListingDialogProps {
  item: InventoryItem | null
  refPrice: number | null
  open: boolean
  onClose: () => void
  onConfirm: (priceTry: number) => Promise<boolean>
}

function ListingDialog({
  item,
  refPrice,
  open,
  onClose,
  onConfirm,
}: ListingDialogProps) {
  const [price, setPrice] = useState<string>("")
  const [saving, setSaving] = useState(false)

  // Sync price input when dialog opens/closes or refPrice changes
  useEffect(() => {
    if (open) {
      setPrice(refPrice != null ? String(Math.round(refPrice)) : "")
    } else {
      setPrice("")
    }
  }, [open, refPrice])

  // Do nothing if no item (null-safe)
  if (!item) return null

  const priceNum = parseFloat(price) || 0
  const commission = Math.round(priceNum * COMMISSION)
  const netToSeller = Math.round(priceNum * (1 - COMMISSION))
  const isValid = priceNum > 0

  const handleConfirm = async () => {
    if (!isValid || saving) return
    setSaving(true)
    try {
      const ok = await onConfirm(priceNum)
      if (ok) onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => { if (!isOpen) onClose() }}
    >
      <DialogContent
        className="border-border bg-card sm:max-w-sm"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Tag className="h-5 w-5 text-primary" />
            İlanı Yayınla
          </DialogTitle>
          <DialogDescription className="sr-only">
            {item.name ?? "Ürün"} için satış fiyatını belirleyin
          </DialogDescription>
        </DialogHeader>

        {/* Item preview */}
        <div className="flex items-center gap-3 rounded-lg border border-border bg-input p-3">
          <div className="relative flex h-14 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-card">
            <div
              className="absolute inset-y-0 left-0 w-1 rounded-l-md"
              style={{ backgroundColor: item.rarityColor ?? "#b0c3d9" }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={safeImg(item.img)}
              alt={item.name ?? ""}
              className="max-h-12 max-w-[85%] object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">
              {item.type ?? ""}
            </p>
            <p className="truncate text-sm font-semibold text-foreground">
              {(item.name ?? "").replace("StatTrak™ ", "").replace("Souvenir ", "")}
            </p>
            {item.rarity && (
              <p className="text-[11px] font-semibold" style={{ color: item.rarityColor ?? "#b0c3d9" }}>
                {item.rarity}
              </p>
            )}
            {item.exterior && (
              <p className="text-[10px] text-muted-foreground">{item.exterior}</p>
            )}
          </div>
        </div>

        {/* Price input */}
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Satış Fiyatı (TL)
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              ₺
            </span>
            <Input
              type="number"
              min={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
              className="border-border bg-input pl-7 text-foreground"
              placeholder="0"
              autoFocus
            />
          </div>
          {refPrice != null && (
            <p className="text-[10px] text-muted-foreground">
              Piyasa referansı: {formatTry(refPrice)}
            </p>
          )}
        </div>

        {/* Commission breakdown — only visible when price is entered */}
        {isValid && (
          <div className="space-y-1.5 rounded-lg border border-border bg-input p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Satış Fiyatı</span>
              <span className="font-semibold text-foreground">{formatTry(priceNum)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Platform Komisyonu (%7)</span>
              <span className="font-semibold text-destructive">− {formatTry(commission)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-1.5">
              <span className="font-bold text-foreground">Elinize Geçecek</span>
              <span className="text-base font-bold text-success">{formatTry(netToSeller)}</span>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" className="border-border" onClick={onClose}>
            İptal
          </Button>
          <Button
            disabled={!isValid || saving}
            onClick={() => { void handleConfirm() }}
            className="bg-primary font-bold uppercase tracking-wide text-primary-foreground hover:bg-primary/90"
          >
            <Tag className="mr-2 h-4 w-4" />
            Yayınla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── InventoryCard ─────────────────────────────────────────────────────────────

interface InventoryCardProps {
  item: InventoryItem
  marketItems: import("@/lib/skins").Skin[]
  onListClick: (item: InventoryItem, refPrice: number | null) => void
}

function InventoryCard({ item, marketItems, onListClick }: InventoryCardProps) {
  const { t } = useI18n()
  const price = getMarketPrice(item.marketHashName, marketItems)
  const displayName = (item.name ?? "")
    .replace("StatTrak™ ", "")
    .replace("Souvenir ", "")

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card p-3 transition-colors hover:border-[#243146]">
      {/* Rarity colour bar */}
      <div
        className="absolute inset-x-0 top-0 h-1 rounded-t-xl"
        style={{ backgroundColor: item.rarityColor ?? "#b0c3d9" }}
      />

      {/* Badges */}
      <div className="mb-1.5 mt-0.5 flex items-center justify-between text-[9px]">
        <span
          className="font-semibold"
          style={{ color: item.rarityColor ?? "#b0c3d9" }}
        >
          {item.exterior || "—"}
        </span>
        <div className="flex gap-1">
          {item.stattrak && (
            <span className="rounded bg-[#cf6a32]/20 px-1 py-px font-extrabold text-[#cf6a32]">
              ST™
            </span>
          )}
          {item.souvenir && (
            <span className="rounded bg-[#ffe400]/20 px-1 py-px font-extrabold text-[#ffe400]">
              SV
            </span>
          )}
          {!item.tradable && (
            <span className="rounded bg-destructive/15 px-1 py-px font-bold text-destructive">
              Kilit
            </span>
          )}
        </div>
      </div>

      {/* Item image */}
      <div className="flex h-[90px] items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={safeImg(item.img)}
          alt={displayName}
          className="max-h-full max-w-[90%] object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]"
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }}
        />
      </div>

      {/* Item info */}
      <div className="mt-2 min-w-0">
        <p className="truncate text-[9px] font-bold uppercase text-muted-foreground">
          {item.type ?? ""}
        </p>
        <p className="truncate text-[11px] font-semibold leading-tight text-foreground">
          {displayName}
        </p>
        {item.rarity && (
          <p
            className="text-[9px] font-semibold"
            style={{ color: item.rarityColor ?? "#b0c3d9" }}
          >
            {item.rarity}
          </p>
        )}
        {price != null && (
          <p className="mt-0.5 text-[11px] font-bold text-success">{formatPrice(price)}</p>
        )}
      </div>

      {/* Hover overlay — only appears on hover */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-xl bg-card/96 px-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        {item.tradable && (
          <Button
            size="sm"
            onClick={() => onListClick(item, price)}
            className="h-8 w-full bg-primary text-[10px] font-bold uppercase text-primary-foreground hover:bg-primary/90"
          >
            <Tag className="mr-1.5 h-3.5 w-3.5" />
            {t("sell.list")}
          </Button>
        )}
        {item.marketHashName && (
          <a
            href={`https://steamcommunity.com/market/listings/730/${encodeURIComponent(item.marketHashName)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-7 w-full items-center justify-center gap-1.5 rounded-md border border-border bg-input text-[10px] font-semibold text-muted-foreground hover:border-[#66c0f4] hover:text-[#66c0f4]"
          >
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
              <path d="M11.98 0C5.67 0 .5 4.87.02 11.06l6.43 2.66a3.4 3.4 0 0 1 1.92-.59l2.86-4.15v-.06a4.54 4.54 0 1 1 4.54 4.54h-.1l-4.08 2.92.01.4a3.41 3.41 0 0 1-6.76.66L.07 15.4C1.52 20.4 6.32 24 11.98 24 18.62 24 24 18.63 24 12S18.62 0 11.98 0z" />
            </svg>
            Steam
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
      </div>
    </div>
  )
}

// ─── InventorySheet ────────────────────────────────────────────────────────────

interface InventorySheetProps {
  trigger?: React.ReactNode
}

export function InventorySheet({ trigger }: InventorySheetProps) {
  const { t } = useI18n()
  const { steamProfile, items: marketItems } = useMarket()

  // Sheet open/close
  const [open, setOpen] = useState(false)

  // Inventory data
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<"private" | "timeout" | "error" | null>(null)
  const [total, setTotal] = useState(0)

  // Listing dialog state — lifted here so dialog renders OUTSIDE SheetContent
  const [listingItem, setListingItem] = useState<InventoryItem | null>(null)
  const [listingRefPrice, setListingRefPrice] = useState<number | null>(null)

  // Ref prevents duplicate fetches within same open session
  const hasFetched = useRef(false)

  const fetchInventory = async () => {
    const steamId = steamProfile?.steamId
    if (!steamId) return

    setLoading(true)
    setFetchError(null)

    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 25_000)
      const res = await fetch(`/api/inventory?steamId=${encodeURIComponent(steamId)}`, {
        signal: controller.signal,
      })
      clearTimeout(timer)
      if (res.status === 429) throw new Error("rate_limited")
      if (!res.ok) throw new Error(`http_${res.status}`)

      const data: ApiResponse = await res.json()

      if ("error" in data && data.error) {
        setFetchError(
          data.error === "private" ? "private"
            : data.error === "timeout" ? "timeout"
              : "error",
        )
        setInventoryItems([])
        setTotal(0)
      } else {
        // Defensively filter out any malformed items
        const safe = (data.items ?? []).filter(
          (item): item is InventoryItem =>
            typeof item === "object" &&
            item !== null &&
            typeof item.assetId === "string",
        )
        setInventoryItems(safe)
        setTotal(data.total ?? safe.length)
      }
    } catch (e) {
      setFetchError(e instanceof Error && e.name === "AbortError" ? "timeout" : "error")
      setInventoryItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  // Fetch when sheet is open AND steamId is available.
  // Include steamProfile?.steamId in deps so it re-runs after login completes.
  useEffect(() => {
    const steamId = steamProfile?.steamId
    if (open && steamId && !hasFetched.current) {
      hasFetched.current = true
      fetchInventory()
    }
    if (!open) {
      hasFetched.current = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, steamProfile?.steamId])

  // Handlers
  const handleListClick = (item: InventoryItem, refPrice: number | null) => {
    setListingItem(item)
    setListingRefPrice(refPrice)
  }

  const handleListClose = () => {
    setListingItem(null)
    setListingRefPrice(null)
  }

  const handleConfirm = async (priceTry: number): Promise<boolean> => {
    if (!steamProfile || !listingItem) return false
    const result = await createListingWithError(listingItem, priceTry)
    if (result.error === "listing_banned") {
      toast.error(t("listings.banned"))
      return false
    }
    if (!result.listing) {
      const msg = listingErrorMessage(result.error, t)
      toast.error(msg.title)
      return false
    }
    toast.success(t("listings.listedSuccess"), {
      description: `${listingItem.name ?? "Ürün"} — ${formatTry(priceTry)}`,
    })
    return true
  }

  const handleRefresh = () => {
    hasFetched.current = false
    fetchInventory()
  }

  // Derived lists
  const tradable = inventoryItems.filter((i) => i.tradable)
  const locked = inventoryItems.filter((i) => !i.tradable)

  return (
    <>
      {/* ── Sheet ────────────────────────────────────────────────────────── */}
      <Sheet open={open} onOpenChange={setOpen}>
        {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}

        <SheetContent
          className="flex w-full flex-col gap-0 border-border bg-card p-0 sm:max-w-2xl"
        >
          {/* Header */}
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle className="flex items-center gap-2 text-foreground">
              <Package className="h-5 w-5 text-primary" />
              {t("inventory.title")}
              {total > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({total})
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-7 px-2 text-xs text-muted-foreground"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              </Button>
            </SheetTitle>
            <SheetDescription className="sr-only">
              {t("inventory.title")}
            </SheetDescription>
          </SheetHeader>

          {/* Body */}
          <ScrollArea className="flex-1">
            {/* Loading spinner */}
            {loading && (
              <div className="flex flex-col items-center justify-center gap-3 py-16">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">{t("inventory.loading")}</p>
              </div>
            )}

            {/* Private profile message */}
            {!loading && fetchError === "private" && (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                <Lock className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">
                  {t("inventory.private")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("inventory.privateDesc")}
                </p>
                <a
                  href="https://steamcommunity.com/my/edit/settings"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t("inventory.makePublic")}
                </a>
              </div>
            )}

            {/* General fetch error */}
            {!loading && (fetchError === "error" || fetchError === "timeout") && (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <Package className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {fetchError === "timeout" ? t("inventory.timeout") : t("inventory.error")}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="border-border"
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  {t("inventory.retry")}
                </Button>
              </div>
            )}

            {/* Empty inventory */}
            {!loading && !fetchError && inventoryItems.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-16">
                <Package className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{t("inventory.empty")}</p>
              </div>
            )}

            {/* Items */}
            {!loading && !fetchError && inventoryItems.length > 0 && (
              <div className="space-y-6 p-4">
                {tradable.length > 0 && (
                  <section>
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-success">
                      {t("inventory.tradable")} ({tradable.length})
                    </p>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3">
                      {tradable.map((item) => (
                        <InventoryCard
                          key={item.assetId}
                          item={item}
                          marketItems={marketItems}
                          onListClick={handleListClick}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {locked.length > 0 && (
                  <section>
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      {t("inventory.locked")} ({locked.length})
                    </p>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3 opacity-60">
                      {locked.map((item) => (
                        <InventoryCard
                          key={item.assetId}
                          item={item}
                          marketItems={marketItems}
                          onListClick={handleListClick}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* ── ListingDialog — rendered as Fragment sibling, NOT inside Sheet ── */}
      <ListingDialog
        item={listingItem}
        refPrice={listingRefPrice}
        open={listingItem !== null}
        onClose={handleListClose}
        onConfirm={handleConfirm}
      />
    </>
  )
}
