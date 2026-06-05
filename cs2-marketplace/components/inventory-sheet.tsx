"use client"

import { useEffect, useState } from "react"
import { ExternalLink, Lock, Package, RefreshCw, Tag } from "lucide-react"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
  SheetDescription, SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useMarket } from "@/components/market-provider"
import { useI18n } from "@/lib/i18n"
import { formatPrice } from "@/lib/skins"
import type { InventoryItem } from "@/app/api/inventory/route"
import { cn } from "@/lib/utils"

// Match inventory item to marketplace price
function useMarketPrice(marketHashName: string, items: import("@/lib/skins").Skin[]) {
  const match = items.find(s => s.marketHashName === marketHashName)
  return match ? match.price : null
}

function InventoryCard({
  item,
  marketItems,
  onSell,
}: {
  item: InventoryItem
  marketItems: import("@/lib/skins").Skin[]
  onSell: (item: InventoryItem) => void
}) {
  const { t } = useI18n()
  const price = useMarketPrice(item.marketHashName, marketItems)

  return (
    <div className="group relative flex h-[165px] flex-col overflow-hidden rounded-lg border border-border bg-card p-3 transition-all duration-200 hover:border-[#243146] hover:shadow-lg">
      {/* Rarity color bar */}
      <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-lg" style={{ backgroundColor: item.rarityColor }} />

      {/* Badges */}
      <div className="mb-1 flex items-center justify-between text-[9px] z-10">
        <span className="font-semibold text-muted-foreground">{item.exterior || "—"}</span>
        <div className="flex gap-1">
          {item.stattrak && <span className="rounded bg-[#cf6a32]/20 px-1 py-px font-bold text-[#cf6a32]">ST™</span>}
          {item.souvenir && <span className="rounded bg-[#ffe400]/20 px-1 py-px font-bold text-[#ffe400]">SV</span>}
          {!item.tradable && <span className="rounded bg-destructive/20 px-1 py-px font-bold text-destructive">Kilit</span>}
        </div>
      </div>

      {/* Image */}
      <div className="flex h-[75px] items-center justify-center transition-transform duration-200 group-hover:scale-95">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.img}
          alt={item.name}
          className="max-h-full max-w-[90%] object-contain drop-shadow"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      </div>

      {/* Info */}
      <div className="mt-auto min-w-0 z-10 transition-opacity duration-200 group-hover:opacity-20">
        <p className="truncate text-[9px] font-bold uppercase text-muted-foreground">{item.type}</p>
        <p className="truncate text-xs font-semibold text-foreground leading-tight">{item.name.replace("StatTrak™ ", "").replace("Souvenir ", "")}</p>
        {price && (
          <p className="mt-0.5 text-[11px] font-bold text-success">{formatPrice(price)}</p>
        )}
      </div>

      {/* Hover actions - Düzenlenen Akıllı Katman */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-card/95 px-2.5 opacity-0 pointer-events-none transition-all duration-200 group-hover:opacity-100 group-hover:pointer-events-auto z-20">
        {item.tradable ? (
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onSell(item);
            }}
            className="h-8 w-full bg-primary px-2 text-[10px] font-bold uppercase text-primary-foreground hover:bg-primary/90 shadow-md cursor-pointer"
          >
            <Tag className="mr-1 h-3 w-3" />
            {t("sell.list")}
          </Button>
        ) : (
          <div className="flex h-8 w-full items-center justify-center gap-1 rounded-md bg-muted/50 text-[10px] font-bold text-destructive uppercase">
            <Lock className="h-3 w-3" />
            Takas Kilitli
          </div>
        )}
        <a
          href={`https://steamcommunity.com/market/listings/730/${encodeURIComponent(item.marketHashName)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-8 w-full items-center justify-center gap-1 rounded-md border border-border bg-input text-[10px] font-semibold text-muted-foreground hover:border-[#66c0f4] hover:text-[#66c0f4] transition-colors"
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor"><path d="M11.98 0C5.67 0 .5 4.87.02 11.06l6.43 2.66a3.4 3.4 0 0 1 1.92-.59l2.86-4.15v-.06a4.54 4.54 0 1 1 4.54 4.54h-.1l-4.08 2.92.01.4a3.41 3.41 0 0 1-6.76.66L.07 15.4C1.52 20.4 6.32 24 11.98 24 18.62 24 24 18.63 24 12S18.62 0 11.98 0z" /></svg>
          Steam
          <ExternalLink className="h-2.5 w-2.5" />
        </a>
      </div>
    </div>
  )
}

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
      if (data.error === "private") {
        setError("private")
        setInventoryItems([])
      } else if (data.error) {
        setError("fetch_failed")
        setInventoryItems([])
      } else {
        setInventoryItems(data.items || [])
        setTotal(data.total || 0)
      }
    } catch {
      setError("fetch_failed")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && steamProfile?.steamId && inventoryItems.length === 0 && !loading) {
      fetchInventory()
    }
  }, [open, steamProfile?.steamId])

  const tradable = inventoryItems.filter(i => i.tradable)
  const locked = inventoryItems.filter(i => !i.tradable)

  // Listele butonuna basınca çalışacak fonksiyon
  const handleSellItem = (item: InventoryItem) => {
    console.log("Listelenmek üzere seçilen skin:", item);
    // Buraya dilersen market provider'ına veya state'ine ekleme kodunu yazabilirsin:
    // Örn: setSelectedItem(item) veya openSellModal(item)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent className="flex w-full flex-col gap-0 border-border bg-card p-0 sm:max-w-2xl" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <Package className="h-5 w-5 text-primary" />
            {t("inventory.title")}
            {total > 0 && <span className="text-sm font-normal text-muted-foreground">({total})</span>}
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-7 px-2 text-xs text-muted-foreground"
              onClick={fetchInventory}
              disabled={loading}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </Button>
          </SheetTitle>
          <SheetDescription className="sr-only">Sayfa içeriği</SheetDescription>
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
            <div className="p-4 space-y-5">
              {tradable.length > 0 && (
                <section>
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-success">
                    {t("inventory.tradable")} ({tradable.length})
                  </p>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2.5">
                    {tradable.map(item => (
                      <InventoryCard
                        key={item.assetId}
                        item={item}
                        marketItems={marketItems}
                        onSell={handleSellItem}
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
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2.5 opacity-60">
                    {locked.map(item => (
                      <InventoryCard
                        key={item.assetId}
                        item={item}
                        marketItems={marketItems}
                        onSell={handleSellItem}
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
  )
}