"use client"

import { useEffect, useState } from "react"
import { ExternalLink, Lock, Package, RefreshCw, Tag } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useMarket } from "@/components/market-provider"
import { useI18n } from "@/lib/i18n"
import { formatPrice } from "@/lib/skins"
import type { InventoryItem } from "@/app/api/inventory/route"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const COMMISSION = 0.07

// ─── Listing Dialog ────────────────────────────────────────────────────────────

function ListingDialog({
  item,
  refPrice,
  open,
  onClose,
}: {
  item: InventoryItem | null
  refPrice: number | null
  open: boolean
  onClose: () => void
}) {
  const [price, setPrice] = useState("")

  useEffect(() => {
    if (open && refPrice) setPrice(String(Math.round(refPrice)))
  }, [open, refPrice])

  if (!item) return null

  const priceNum = parseFloat(price) || 0
  const commission = Math.round(priceNum * COMMISSION)
  const net = Math.round(priceNum * (1 - COMMISSION))
  const fmt = (v: number) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(v)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}
      onPointerDownOutside={(e) => e.preventDefault()}
      onInteractOutside={(e) => e.preventDefault()}>
      <DialogContent className="border-border bg-card sm:max-w-sm"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Tag className="h-5 w-5 text-primary" />
            İlanı Yayınla
          </DialogTitle>
          <DialogDescription className="sr-only">
            {item.name} için satış fiyatını belirleyin
          </DialogDescription>
        </DialogHeader>

        {/* Item preview */}
        <div className="flex items-center gap-3 rounded-lg border border-border bg-input p-3">
          {/* Rarity left border */}
          <div className="relative flex h-14 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-card">
            <div className="absolute inset-y-0 left-0 w-1 rounded-l-md" style={{ backgroundColor: item.rarityColor }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.img} alt={item.name} className="max-h-12 max-w-[85%] object-contain"
              referrerPolicy="no-referrer" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">{item.type}</p>
            <p className="truncate text-sm font-semibold text-foreground">
              {item.name.replace("StatTrak™ ", "").replace("Souvenir ", "")}
            </p>
            <p className="text-[11px]" style={{ color: item.rarityColor }}>{item.rarity}</p>
            {item.exterior && <p className="text-[10px] text-muted-foreground">{item.exterior}</p>}
          </div>
        </div>

        {/* Price input */}
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Satış Fiyatı (TL)
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₺</span>
            <Input
              type="number"
              min={1}
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="border-border bg-input pl-7 text-foreground"
              placeholder="0"
            />
          </div>
          {refPrice && (
            <p className="text-[10px] text-muted-foreground">
              Piyasa referansı: {fmt(refPrice)}
            </p>
          )}
        </div>

        {/* Commission breakdown */}
        {priceNum > 0 && (
          <div className="rounded-lg border border-border bg-input p-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Satış Fiyatı</span>
              <span className="font-semibold text-foreground">{fmt(priceNum)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Platform Komisyonu (%7)</span>
              <span className="font-semibold text-destructive">− {fmt(commission)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-1.5">
              <span className="font-bold text-foreground">Elinize Geçecek</span>
              <span className="text-base font-bold text-success">{fmt(net)}</span>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" className="border-border" onClick={onClose}>
            İptal
          </Button>
          <Button
            disabled={priceNum <= 0}
            onClick={() => {
              toast.success("İlan yayınlandı!", {
                description: `${item.name} — ${fmt(priceNum)} (net: ${fmt(net)})`,
              })
              onClose()
            }}
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

// ─── Inventory Card ────────────────────────────────────────────────────────────

function useMarketPrice(marketHashName: string, items: import("@/lib/skins").Skin[]) {
  return items.find(s => s.marketHashName === marketHashName)?.price ?? null
}

function InventoryCard({
  item,
  marketItems,
}: {
  item: InventoryItem
  marketItems: import("@/lib/skins").Skin[]
}) {
  const { t } = useI18n()
  const [listOpen, setListOpen] = useState(false)
  const price = useMarketPrice(item.marketHashName, marketItems)

  return (
    <>
      <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card p-3 transition-colors hover:border-[#243146]">
        {/* Rarity color top bar — thicker for visibility */}
        <div
          className="absolute inset-x-0 top-0 h-1 rounded-t-xl"
          style={{ backgroundColor: item.rarityColor }}
        />

        {/* Badges row */}
        <div className="mb-1.5 mt-0.5 flex items-center justify-between text-[9px]">
          <span className="font-semibold" style={{ color: item.rarityColor }}>{item.exterior || "—"}</span>
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

        {/* Image */}
        <div className="flex h-[90px] items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.img}
            alt={item.name}
            className="max-h-full max-w-[90%] object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        </div>

        {/* Info */}
        <div className="mt-2 min-w-0">
          <p className="truncate text-[9px] font-bold uppercase text-muted-foreground">{item.type}</p>
          <p className="truncate text-[11px] font-semibold text-foreground leading-tight">
            {item.name.replace("StatTrak™ ", "").replace("Souvenir ", "")}
          </p>
          <p className="text-[9px] font-semibold" style={{ color: item.rarityColor }}>
            {item.rarity}
          </p>
          {price && (
            <p className="mt-0.5 text-[11px] font-bold text-success">{formatPrice(price)}</p>
          )}
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-xl bg-card/96 px-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {item.tradable && (
            <Button
              size="sm"
              onClick={() => setListOpen(true)}
              className="h-8 w-full bg-primary text-[10px] font-bold uppercase text-primary-foreground hover:bg-primary/90"
            >
              <Tag className="mr-1.5 h-3.5 w-3.5" />
              {t("sell.list")}
            </Button>
          )}
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
        </div>
      </div>

      <ListingDialog
        item={item}
        refPrice={price}
        open={listOpen}
        onClose={() => setListOpen(false)}
      />
    </>
  )
}

// ─── Main Sheet ────────────────────────────────────────────────────────────────

export function InventorySheet({ trigger }: { trigger?: React.ReactNode }) {
  const { t } = useI18n()
  const { steamProfile, items: marketItems } = useMarket()
  const [open, setOpen] = useState(false)
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  const fetchInventory = async () => {
    if (!steamProfile?.steamId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/inventory?steamId=${steamProfile.steamId}`)
      const data = await res.json()
      if (data.error === "private") { setError("private"); setInventoryItems([]) }
      else if (data.error) { setError("error"); setInventoryItems([]) }
      else { setInventoryItems(data.items || []); setTotal(data.total || 0) }
    } catch { setError("error") }
    finally { setLoading(false) }
  }

  // Fetch when sheet opens and we have a steamId
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (open && steamProfile?.steamId && !loading) {
      fetchInventory()
    }
  }, [open, steamProfile?.steamId])

  const tradable = inventoryItems.filter(i => i.tradable)
  const locked = inventoryItems.filter(i => !i.tradable)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent
        className="flex w-full flex-col gap-0 border-border bg-card p-0 sm:max-w-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <Package className="h-5 w-5 text-primary" />
            {t("inventory.title")}
            {total > 0 && <span className="text-sm font-normal text-muted-foreground">({total})</span>}
            <Button variant="ghost" size="sm" className="ml-auto h-7 px-2 text-xs text-muted-foreground"
              onClick={fetchInventory} disabled={loading}>
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </Button>
          </SheetTitle>
          <SheetDescription className="sr-only">
            {t("inventory.title")}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{t("inventory.loading")}</p>
            </div>
          ) : error === "private" ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <Lock className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">{t("inventory.private")}</p>
              <p className="text-xs text-muted-foreground">{t("inventory.privateDesc")}</p>
              <a href="https://steamcommunity.com/my/edit/settings" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                <ExternalLink className="h-3.5 w-3.5" />
                {t("inventory.makePublic")}
              </a>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Package className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("inventory.error")}</p>
              <Button variant="outline" size="sm" onClick={fetchInventory} className="border-border">
                {t("inventory.retry")}
              </Button>
            </div>
          ) : inventoryItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Package className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("inventory.empty")}</p>
            </div>
          ) : (
            <div className="p-4 space-y-6">
              {tradable.length > 0 && (
                <section>
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-success">
                    {t("inventory.tradable")} ({tradable.length})
                  </p>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3">
                    {tradable.map(item => (
                      <InventoryCard key={item.assetId} item={item} marketItems={marketItems} />
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
                    {locked.map(item => (
                      <InventoryCard key={item.assetId} item={item} marketItems={marketItems} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
