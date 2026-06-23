"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  ExternalLink, Lock, Package, Pencil, RefreshCw, Tag, User, XCircle,
} from "lucide-react"
import { toast } from "sonner"
import {
  cancelListing, createListingWithError, getActiveListings,
  subscribeListings, syncListings, updateListingPrice, type Listing,
} from "@/lib/listings"

const COMMISSION_RATE = 0.07  // 7% platform commission
const INV_PAGE_SIZE = 48
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
  SheetDescription, SheetTrigger,
} from "@/components/ui/sheet"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useMarket } from "@/components/market-provider"
import { useI18n } from "@/lib/i18n"
import { OrdersPanel } from "@/components/orders-panel"
import { formatPrice, steamProfileUrl } from "@/lib/skins"
import { listingErrorMessage } from "@/lib/listing-errors"
import { fetchWalletData, type WalletTransaction } from "@/lib/user-data-client"
import type { InventoryItem } from "@/lib/inventory-types"
import { cn } from "@/lib/utils"

// ─── Profile tab ─────────────────────────────────────────────────────────────

function ProfileTab() {
  const { t } = useI18n()
  const { steamProfile, wallet, isLoggedIn } = useMarket()
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])

  useEffect(() => {
    if (!isLoggedIn) return
    void fetchWalletData().then((data) => {
      if (data) setTransactions(data.transactions.slice(0, 5))
    })
  }, [isLoggedIn, wallet])

  if (!isLoggedIn || !steamProfile) return null

  return (
    <div className="flex flex-col items-center gap-4 p-6 text-center">
      <div className="relative">
        {steamProfile.steamAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={steamProfile.steamAvatar}
            alt={steamProfile.steamName ?? ""}
            className="h-20 w-20 rounded-full border-4 border-primary/30 object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-primary/30 bg-input">
            <User className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-success">
          <span className="h-2 w-2 rounded-full bg-white" />
        </span>
      </div>

      <div>
        <h2 className="text-lg font-bold text-foreground">{steamProfile.steamName ?? steamProfile.steamId}</h2>
        <p className="text-xs text-muted-foreground">Steam ID: {steamProfile.steamId}</p>
      </div>

      <div className="w-full rounded-xl border border-border bg-input p-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t("cart.wallet")}</span>
          <span className="text-xl font-bold text-success">{formatPrice(wallet)}</span>
        </div>
      </div>

      <div className="w-full rounded-xl border border-border bg-input p-4 text-left text-sm">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("wallet.recentTx")}</p>
        {transactions.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("wallet.noTx")}</p>
        ) : (
          <ul className="space-y-1.5">
            {transactions.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between text-xs">
                <span className="truncate text-muted-foreground">{tx.type}</span>
                <span className={cn("font-semibold", tx.amount >= 0 ? "text-success" : "text-destructive")}>
                  {tx.amount >= 0 ? "+" : ""}{formatPrice(Math.abs(tx.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {steamProfile.steamId && (
        <a
          href={steamProfileUrl(steamProfile.steamId)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-md bg-[#1b2838] px-4 py-2 text-xs font-semibold text-white ring-1 ring-white/10 hover:bg-[#2a475e]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#66c0f4]" fill="currentColor">
            <path d="M11.98 0C5.67 0 .5 4.87.02 11.06l6.43 2.66a3.4 3.4 0 0 1 1.92-.59l2.86-4.15v-.06a4.54 4.54 0 1 1 4.54 4.54h-.1l-4.08 2.92.01.4a3.41 3.41 0 0 1-6.76.66L.07 15.4C1.52 20.4 6.32 24 11.98 24 18.62 24 24 18.63 24 12S18.62 0 11.98 0z" />
          </svg>
          Steam Profilini Görüntüle
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  )
}

// ─── My listings tab ──────────────────────────────────────────────────────────

function ListingCard({
  listing,
  onDelist,
  onPriceUpdated,
}: {
  listing: Listing
  onDelist: (listing: Listing) => void
  onPriceUpdated: () => void
}) {
  const { t } = useI18n()
  const displayName = (listing.name ?? "").replace("StatTrak™ ", "").replace("Souvenir ", "")

  const handleEditPrice = async () => {
    const next = window.prompt(t("listings.editPricePrompt"), String(listing.priceTry))
    if (!next) return
    const priceTry = Math.round(parseFloat(next))
    if (!Number.isFinite(priceTry) || priceTry <= 0) {
      toast.error(t("listings.invalidPrice"))
      return
    }
    const updated = await updateListingPrice(listing.id, priceTry)
    if (updated) {
      toast.success(t("listings.priceUpdated"))
      onPriceUpdated()
    } else {
      toast.error(t("listings.priceUpdateFailed"))
    }
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card p-2">
      <div className="absolute inset-x-0 top-0 h-0.5" style={{ backgroundColor: listing.rarityColor ?? "#b0c3d9" }} />
      <div className="flex h-[70px] items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={listing.img || "/placeholder.svg"}
          alt={displayName}
          className="max-h-full max-w-[90%] object-contain"
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }}
        />
      </div>
      <p className="truncate text-[9px] font-bold uppercase text-muted-foreground">{listing.type ?? ""}</p>
      <p className="truncate text-[10px] font-semibold text-foreground leading-tight">{displayName}</p>
      {listing.exterior && <p className="text-[9px] text-muted-foreground">{listing.exterior}</p>}
      <p className="text-[10px] font-bold text-success">{formatPrice(listing.priceTry)}</p>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-card/90 px-2 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={handleEditPrice}
          className="flex h-7 w-full items-center justify-center gap-1 rounded-md bg-primary px-2 text-[10px] font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Pencil className="h-3 w-3 shrink-0" />
          <span className="truncate">{t("listings.editPrice")}</span>
        </button>
        <button
          onClick={() => onDelist(listing)}
          className="flex h-7 w-full min-w-0 max-w-full items-center justify-center gap-1 rounded-md bg-destructive px-2 text-[10px] font-semibold text-destructive-foreground hover:bg-destructive/90"
        >
          <XCircle className="h-3 w-3 shrink-0" />
          <span className="truncate">{t("sell.unpublish")}</span>
        </button>
      </div>
    </div>
  )
}

function MyListingsTab() {
  const { t } = useI18n()
  const { steamProfile } = useMarket()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = () => {
    const mine = getActiveListings().filter((l) => l.sellerId === steamProfile?.steamId)
    setListings(mine)
  }

  useEffect(() => {
    let mounted = true
    setLoading(true)
    syncListings().finally(() => {
      if (!mounted) return
      refresh()
      setLoading(false)
    })
    const unsub = subscribeListings(() => refresh())
    return () => { mounted = false; unsub() }
  }, [steamProfile?.steamId])

  const handleDelist = async (listing: Listing) => {
    if (!steamProfile?.steamId) return
    const ok = await cancelListing(listing.id)
    if (ok) {
      toast.success(t("sell.unpublished"))
      refresh()
    } else {
      toast.error(t("sell.unpublishFailed"))
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{t("listings.loading")}</p>
      </div>
    )
  }

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <Tag className="h-10 w-10 opacity-30" />
        <p className="text-sm">{t("listings.empty")}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-muted-foreground">
          {t("listings.count").replace("{count}", String(listings.length))}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px]"
          onClick={() => { setLoading(true); syncListings().finally(() => { refresh(); setLoading(false) }) }}
        >
          <RefreshCw className="mr-1 h-3 w-3" />{t("inventory.retry")}
        </Button>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} onDelist={handleDelist} onPriceUpdated={refresh} />
        ))}
      </div>
    </div>
  )
}

// ─── Inventory tab ────────────────────────────────────────────────────────────

function InventoryTab({
  active,
  onListClick,
}: {
  active: boolean
  onListClick: (item: InventoryItem, price: number | null) => void
}) {
  const { t } = useI18n()
  const { steamProfile, items: marketItems } = useMarket()
  const [invItems, setInvItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [visibleTradable, setVisibleTradable] = useState(INV_PAGE_SIZE)
  const [visibleLocked, setVisibleLocked] = useState(INV_PAGE_SIZE)
  const loadedFor = useRef<string | null>(null)

  const priceByHash = useMemo(() => {
    const map = new Map<string, number>()
    for (const skin of marketItems) {
      if (skin.marketHashName && !map.has(skin.marketHashName)) {
        map.set(skin.marketHashName, skin.price)
      }
    }
    return map
  }, [marketItems])

  const fetchInv = async () => {
    const steamId = steamProfile?.steamId
    if (!steamId) return
    setLoading(true)
    setError(null)
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 25_000)
      const res = await fetch(`/api/inventory?steamId=${encodeURIComponent(steamId)}`, {
        signal: controller.signal,
      })
      clearTimeout(timer)
      if (res.status === 429) throw new Error("rate_limited")
      if (!res.ok) throw new Error(`http_${res.status}`)
      const data = await res.json()
      if (data.error === "private") { setError("private"); setInvItems([]); setTotal(0) }
      else if (data.error === "timeout") { setError("timeout"); setInvItems([]); setTotal(0) }
      else if (data.error) { setError("error"); setInvItems([]); setTotal(0) }
      else {
        const safe = (data.items ?? []).filter(
          (item: unknown): item is InventoryItem =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as InventoryItem).assetId === "string",
        )
        setInvItems(safe)
        setTotal(data.total ?? safe.length)
      }
      loadedFor.current = steamId
    } catch (e) {
      setError(e instanceof Error && e.name === "AbortError" ? "timeout" : "error")
      setInvItems([])
      setTotal(0)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    const steamId = steamProfile?.steamId
    if (!active || !steamId) return
    if (loadedFor.current === steamId) return
    void fetchInv()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, steamProfile?.steamId])

  useEffect(() => {
    loadedFor.current = null
    setInvItems([])
    setTotal(0)
    setError(null)
    setVisibleTradable(INV_PAGE_SIZE)
    setVisibleLocked(INV_PAGE_SIZE)
  }, [steamProfile?.steamId])

  if (!steamProfile?.steamId) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <Package className="h-10 w-10 opacity-30" />
        <p className="text-sm">{t("inventory.error")}</p>
      </div>
    )
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{t("inventory.loading")}</p>
    </div>
  )

  if (error === "private") return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-14 text-center">
      <Lock className="h-10 w-10 text-muted-foreground" />
      <div>
        <p className="text-sm font-semibold text-foreground">{t("inventory.private")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("inventory.privateDesc")}</p>
      </div>
      <a href="https://steamcommunity.com/my/edit/settings" target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs text-primary hover:underline">
        <ExternalLink className="h-3.5 w-3.5" />
        {t("inventory.makePublic")}
      </a>
      <Button variant="outline" size="sm" onClick={() => { loadedFor.current = null; void fetchInv() }} className="border-border text-xs">
        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />{t("inventory.retry")}
      </Button>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <Package className="h-10 w-10 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">
        {error === "timeout" ? t("inventory.timeout") : t("inventory.error")}
      </p>
      <Button variant="outline" size="sm" onClick={() => { loadedFor.current = null; void fetchInv() }} className="border-border">
        <RefreshCw className="mr-1.5 h-3 w-3" />{t("inventory.retry")}
      </Button>
    </div>
  )

  if (invItems.length === 0) return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
      <Package className="h-10 w-10 opacity-30" />
      <p className="text-sm">{t("inventory.empty")}</p>
    </div>
  )

  const tradable = invItems.filter(i => i.tradable)
  const locked = invItems.filter(i => !i.tradable)
  const shownTradable = tradable.slice(0, visibleTradable)
  const shownLocked = locked.slice(0, visibleLocked)

  return (
    <div className="space-y-4 p-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-muted-foreground">{total} item · {tradable.length} {t("inventory.tradable")}</p>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => { loadedFor.current = null; void fetchInv() }}>
          <RefreshCw className="mr-1 h-3 w-3" />{t("inventory.retry")}
        </Button>
      </div>
      {tradable.length > 0 && (
        <section>
          <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wide text-success">
            {t("inventory.tradable")} ({tradable.length})
          </p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2">
            {shownTradable.map(item => (
              <InvCard
                key={item.assetId}
                item={item}
                price={item.marketHashName ? priceByHash.get(item.marketHashName) ?? null : null}
                onListClick={onListClick}
              />
            ))}
          </div>
          {visibleTradable < tradable.length && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full border-border text-xs"
              onClick={() => setVisibleTradable((n) => n + INV_PAGE_SIZE)}
            >
              {t("items.loadMore")} ({tradable.length - visibleTradable})
            </Button>
          )}
        </section>
      )}
      {locked.length > 0 && (
        <section className="opacity-60">
          <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {t("inventory.locked")} ({locked.length})
          </p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2">
            {shownLocked.map(item => (
              <InvCard
                key={item.assetId}
                item={item}
                price={item.marketHashName ? priceByHash.get(item.marketHashName) ?? null : null}
                onListClick={onListClick}
              />
            ))}
          </div>
          {visibleLocked < locked.length && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full border-border text-xs"
              onClick={() => setVisibleLocked((n) => n + INV_PAGE_SIZE)}
            >
              {t("items.loadMore")} ({locked.length - visibleLocked})
            </Button>
          )}
        </section>
      )}
    </div>
  )
}

function ListingDialog({
  item, refPrice, open, onClose, onConfirm
}: {
  item: InventoryItem | null
  refPrice: number | null
  open: boolean
  onClose: () => void
  onConfirm?: (priceTry: number) => Promise<boolean>
}) {
  const [price, setPrice] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setPrice(refPrice != null ? String(Math.round(refPrice)) : "")
    } else {
      setPrice("")
    }
  }, [open, refPrice])

  if (!open || !item) return null

  const priceNum = parseFloat(price) || 0
  const commission = Math.round(priceNum * COMMISSION_RATE)
  const netToSeller = Math.round(priceNum * (1 - COMMISSION_RATE))
  const fmt = (v: number) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(v)
  const displayName = (item.name ?? "").replace("StatTrak™ ", "").replace("Souvenir ", "")

  const handleConfirm = async () => {
    if (!onConfirm || priceNum <= 0 || saving) return
    setSaving(true)
    try {
      const ok = await onConfirm(priceNum)
      if (ok) onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="border-border bg-card sm:max-w-sm" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Tag className="h-5 w-5 text-primary" />
            İlanı Yayınla
          </DialogTitle>
          <DialogDescription className="sr-only">
            {displayName || "Ürün"} için satış fiyatı ve komisyon hesabı
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.img || "/placeholder.svg"}
            alt={displayName}
            className="h-14 w-16 object-contain"
            referrerPolicy="no-referrer"
            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }}
          />
          <div>
            <p className="text-xs font-semibold text-foreground">{displayName}</p>
            {item.exterior && <p className="text-[10px] text-muted-foreground">{item.exterior}</p>}
          </div>
        </div>

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
            />
          </div>
          {refPrice && (
            <p className="text-[10px] text-muted-foreground">Piyasa referansı: {fmt(refPrice)}</p>
          )}
        </div>

        {priceNum > 0 && (
          <div className="rounded-lg border border-border bg-input p-3 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Satış Fiyatı</span>
              <span className="font-semibold text-foreground">{fmt(priceNum)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform Komisyonu (%7)</span>
              <span className="text-destructive">-{fmt(commission)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1 mt-1">
              <span className="font-bold text-foreground">Elinize Geçecek</span>
              <span className="font-bold text-success">{fmt(netToSeller)}</span>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" className="border-border" onClick={onClose}>
            İptal
          </Button>
          <Button
            disabled={priceNum <= 0 || saving}
            onClick={() => { void handleConfirm() }}
            className="bg-primary font-bold uppercase text-primary-foreground hover:bg-primary/90"
          >
            {saving ? "..." : "Yayınla"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function InvCard({
  item,
  price,
  onListClick,
}: {
  item: InventoryItem
  price: number | null
  onListClick: (item: InventoryItem, price: number | null) => void
}) {
  const displayName = (item.name ?? "").replace("StatTrak™ ", "").replace("Souvenir ", "")

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card p-2">
        <div className="absolute inset-x-0 top-0 h-0.5" style={{ backgroundColor: item.rarityColor ?? "#b0c3d9" }} />
        <div className="flex h-[70px] items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.img || "/placeholder.svg"}
            alt={displayName}
            className="max-h-full max-w-[90%] object-contain"
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }}
          />
        </div>
        <p className="truncate text-[9px] font-bold uppercase text-muted-foreground">{item.type ?? ""}</p>
        <p className="truncate text-[10px] font-semibold text-foreground leading-tight">
          {displayName}
        </p>
        {item.exterior && <p className="text-[9px] text-muted-foreground">{item.exterior}</p>}
        {price != null && <p className="text-[10px] font-bold text-success">{formatPrice(price)}</p>}

        {item.tradable && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/90 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => onListClick(item, price)}
              className="flex items-center gap-1 rounded-md bg-primary px-2 py-1.5 text-[10px] font-bold uppercase text-primary-foreground hover:bg-primary/90"
            >
              <Tag className="h-3 w-3" />
              Listele
            </button>
          </div>
        )}
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function ProfileSheet({ trigger }: { trigger?: React.ReactNode }) {
  const { t } = useI18n()
  const { steamProfile, openProfileCompletion } = useMarket()
  const [tab, setTab] = useState("profile")
  const [listingItem, setListingItem] = useState<InventoryItem | null>(null)
  const [listingRefPrice, setListingRefPrice] = useState<number | null>(null)

  const handleListClick = (item: InventoryItem, price: number | null) => {
    setListingItem(item)
    setListingRefPrice(price)
  }

  const handleListClose = () => {
    setListingItem(null)
    setListingRefPrice(null)
  }

  return (
    <>
      <Sheet>
        {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
        <SheetContent className="flex h-full w-full flex-col gap-0 overflow-hidden border-border bg-card p-0 sm:max-w-lg">
          <SheetHeader className="shrink-0 border-b border-border px-5 py-4">
            <SheetTitle className="flex items-center gap-2 text-foreground">
              <User className="h-5 w-5 text-primary" />
              {t("header.profile")}
            </SheetTitle>
            <SheetDescription className="sr-only">Sayfa içeriği</SheetDescription>
          </SheetHeader>

          <Tabs value={tab} onValueChange={setTab} defaultValue="profile" className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <TabsList className="mx-4 mt-3 mb-1 grid grid-cols-2 gap-1 bg-input sm:grid-cols-4">
              <TabsTrigger value="profile" className="text-[10px] sm:text-xs">Profil</TabsTrigger>
              <TabsTrigger value="orders" className="text-[10px] sm:text-xs">{t("orders.title")}</TabsTrigger>
              <TabsTrigger value="listings" className="text-[10px] sm:text-xs">{t("listings.myActive")}</TabsTrigger>
              <TabsTrigger value="inventory" className="text-[10px] sm:text-xs">{t("inventory.title")}</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-full"><ProfileTab /></ScrollArea>
            </TabsContent>
            <TabsContent value="orders" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-full"><OrdersPanel /></ScrollArea>
            </TabsContent>
            <TabsContent value="listings" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-full"><MyListingsTab /></ScrollArea>
            </TabsContent>
            <TabsContent value="inventory" className="mt-0 min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
                <InventoryTab active={tab === "inventory"} onListClick={handleListClick} />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Render outside Sheet to avoid nested Radix modal conflicts */}
      <ListingDialog
        item={listingItem}
        refPrice={listingRefPrice}
        open={listingItem !== null}
        onClose={handleListClose}
        onConfirm={async (priceTry) => {
          if (!steamProfile || !listingItem) return false
          const result = await createListingWithError(listingItem, priceTry)
          if (result.error === "listing_banned") {
            toast.error(t("listings.banned"))
            return false
          }
          if (result.error === "profile_incomplete") {
            openProfileCompletion()
            return false
          }
          if (!result.listing) {
            const msg = listingErrorMessage(result.error, t)
            toast.error(msg.title)
            return false
          }
          const displayName = (listingItem.name ?? "").replace("StatTrak™ ", "").replace("Souvenir ", "")
          toast.success(t("listings.listedSuccess"), {
            description: `${displayName || "Ürün"} — ${formatPrice(priceTry)}`,
          })
          return true
        }}
      />
    </>
  )
}
