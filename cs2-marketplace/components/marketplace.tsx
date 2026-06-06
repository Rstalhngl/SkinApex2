"use client"

import { useEffect, useMemo, useState } from "react"
import { LifeBuoy, PackageOpen, Search, SlidersHorizontal, Tag } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { SiteHeader } from "@/components/site-header"
import { LiveTicker } from "@/components/live-ticker"
import { FilterSidebar, type Filters, PRICE_FILTER_MAX } from "@/components/filter-sidebar"
import { InspectDialog } from "@/components/inspect-dialog"
import { SellDialog } from "@/components/sell-dialog"
import { OfferDialog } from "@/components/offer-dialog"
import { useMarket } from "@/components/market-provider"
import { categoryOf, type Skin } from "@/lib/skins"
import { useI18n } from "@/lib/i18n"
import { getActiveListings, subscribeListings, type Listing } from "@/lib/listings"

const DEFAULT_FILTERS: Filters = {
  sort: "all",
  st: false,
  sv: false,
  exterior: "all",
  category: null,
  weapon: null,
  rarity: null,
  priceMin: 0,
  priceMax: PRICE_FILTER_MAX,
}

const PAGE_SIZE = 48
const SUPPORT_EMAIL = "support@skinapex.net"

// Convert a real Listing → Skin-like object for card rendering
function listingToSkin(listing: Listing): Skin & { listingId: string } {
  const exterior = listing.exterior as Skin["exterior"] || "FN"
  const rarity = listing.rarity.toLowerCase().replace(/ /g, "_").replace(/-/g, "_")
  const rarityMap: Record<string, Skin["rarity"]> = {
    "covert": "covert", "classified": "classified", "restricted": "restricted",
    "mil_spec_grade": "milspec", "industrial_grade": "industrial",
    "contraband": "contraband", "consumer_grade": "industrial",
    "extraordinary": "covert", "master": "covert", "superior": "classified",
    "exceptional": "restricted", "high_grade": "milspec", "remarkable": "restricted",
    "distinguished": "milspec", "base_grade": "industrial",
  }
  const rarityKey = rarityMap[rarity] ?? "milspec"

  const nameParts = listing.name
    .replace("StatTrak™ ", "").replace("Souvenir ", "").split(" | ")
  const type = listing.type || nameParts[0] || "Unknown"
  const title = nameParts.slice(1).join(" | ").replace(/\s*\([^)]+\)\s*$/, "").trim()
    || listing.name.replace(/\s*\([^)]+\)\s*$/, "")

  return {
    id: parseInt(listing.id.replace("listing-", "")) + 100000,
    listingId: listing.id,
    owner: "other",
    type,
    title: title || type,
    exterior,
    rarity: rarityKey,
    float: 0,
    oldPrice: Math.round(listing.priceTry * 1.1),
    price: listing.priceTry,
    priceUsd: undefined,
    discount: -10, // placeholder
    isST: listing.stattrak,
    isSV: listing.souvenir,
    popularity: 50,
    listedAt: listing.listedAt,
    img: listing.img,
    stickers: [],
    hasFloat: false,
    marketHashName: listing.marketHashName,
  } as Skin & { listingId: string }
}

// Loading skeleton
function SkeletonCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card p-4 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-3 w-12 rounded bg-border" />
        <div className="h-3 w-10 rounded bg-border" />
      </div>
      <div className="my-2.5 flex h-[120px] items-center justify-center rounded-lg bg-input" />
      <div className="mt-auto space-y-1.5 border-t border-border pt-3">
        <div className="h-3 w-16 rounded bg-border" />
        <div className="h-4 w-24 rounded bg-border" />
        <div className="flex justify-between">
          <div className="h-3 w-12 rounded bg-border" />
          <div className="h-4 w-16 rounded bg-border" />
        </div>
      </div>
    </div>
  )
}

// Empty marketplace state
function EmptyMarketplace({ onReset, hasFilters }: { onReset: () => void; hasFilters: boolean }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card py-24 text-center">
      <Tag className="h-12 w-12 text-muted-foreground opacity-40" />
      {hasFilters ? (
        <>
          <p className="text-sm text-muted-foreground">{t("empty.title")}</p>
          <Button variant="outline" size="sm" onClick={onReset} className="border-border bg-input">
            {t("empty.reset")}
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-foreground">Henüz ilan yok</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            İlk ilanı sen aç! Steam envanterinden bir ürünü profilinden listeleyebilirsin.
          </p>
        </>
      )}
    </div>
  )
}

export function Marketplace() {
  const { t } = useI18n()
  const { isLoadingItems } = useMarket()

  // Real listings from the store
  const [listings, setListings] = useState<Listing[]>(() => getActiveListings())
  useEffect(() => subscribeListings(() => setListings([...getActiveListings()])), [])

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [search, setSearch] = useState("")
  const [inspecting, setInspecting] = useState<Skin | null>(null)
  const [selling, setSelling] = useState<Skin | null>(null)
  const [offering, setOffering] = useState<Skin | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // Convert listings to Skin objects
  const allSkins = useMemo(() => listings.map(listingToSkin), [listings])

  const visible = useMemo(() => {
    let list = [...allSkins]

    const q = search.trim().toLowerCase()
    if (q) list = list.filter(s =>
      s.title.toLowerCase().includes(q) || s.type.toLowerCase().includes(q)
    )

    if (filters.category) list = list.filter(s => categoryOf(s.type) === filters.category)
    if (filters.weapon) list = list.filter(s => s.type === filters.weapon)
    if (filters.rarity) list = list.filter(s => s.rarity === filters.rarity)
    if (filters.st) list = list.filter(s => s.isST)
    if (filters.sv) list = list.filter(s => s.isSV)
    if (filters.exterior !== "all") list = list.filter(s => s.exterior === filters.exterior)
    if (filters.priceMin > 0 || filters.priceMax < PRICE_FILTER_MAX) {
      list = list.filter(s => s.price >= filters.priceMin && s.price <= filters.priceMax)
    }

    switch (filters.sort) {
      case "all":         /* no sort — listing order */ break
      case "popular":     list.sort((a, b) => b.popularity - a.popularity); break
      case "newest":      list.sort((a, b) => b.listedAt - a.listedAt); break
      case "discount-desc": list.sort((a, b) => b.discount - a.discount); break
      case "price-asc":   list.sort((a, b) => a.price - b.price); break
      case "price-desc":  list.sort((a, b) => b.price - a.price); break
      case "float-asc":   list.sort((a, b) => a.float - b.float); break
      case "float-desc":  list.sort((a, b) => b.float - a.float); break
    }

    return list
  }, [allSkins, filters, search])

  const displayed = visible.slice(0, visibleCount)
  const hasMore = visibleCount < visible.length

  const activeFilters =
    filters.st || filters.sv || filters.exterior !== "all" ||
    !!filters.category || !!filters.weapon || !!filters.rarity ||
    filters.priceMin > 0 || filters.priceMax < PRICE_FILTER_MAX || !!search

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS)
    setSearch("")
    setVisibleCount(PAGE_SIZE)
  }

  return (
    <div className="min-h-screen pb-16">
      <LiveTicker />
      <SiteHeader onResetFilters={resetFilters} onShowMyListings={() => {}} />

      <div className="mx-auto grid max-w-[1600px] gap-6 px-4 py-6 md:grid-cols-[280px_1fr] md:px-10">
        <aside className="hidden md:block">
          <div className="sticky top-[64px] max-h-[calc(100vh-80px)] overflow-y-auto rounded-xl border border-border bg-card p-6 scrollbar-thin">
            <FilterSidebar
              filters={filters}
              onChange={(f) => { setFilters(f); setVisibleCount(PAGE_SIZE) }}
              onReset={resetFilters}
            />
          </div>
        </aside>

        <div className="flex flex-col gap-5">
          {/* Search + mobile filter toggle */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE) }}
                placeholder={t("search.placeholder")}
                className="h-12 border-border bg-card pl-11 text-base text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="h-12 shrink-0 border-border bg-card md:hidden"
                  aria-label={t("search.openFilters")}>
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="border-border bg-card"
                onPointerDownOutside={(e) => e.preventDefault()}
                onInteractOutside={(e) => e.preventDefault()}>
                <SheetTitle className="sr-only">{t("filter.title")}</SheetTitle>
                <SheetDescription className="sr-only">{t("filter.title")}</SheetDescription>
                <div className="mt-6">
                  <FilterSidebar filters={filters}
                    onChange={(f) => { setFilters(f); setVisibleCount(PAGE_SIZE) }}
                    onReset={resetFilters} />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Active filter chips */}
          {activeFilters && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                {t(visible.length === 1 ? "results.count_one" : "results.count", { n: visible.length })}
              </span>
              <Button variant="ghost" size="sm" onClick={resetFilters}
                className="h-7 text-xs text-muted-foreground hover:text-foreground">
                {t("results.clearAll")}
              </Button>
            </div>
          )}

          {/* Item count */}
          {!activeFilters && listings.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("results.count", { n: visible.length })} {t("items.total")}
            </p>
          )}

          {/* Grid */}
          {isLoadingItems ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : visible.length === 0 ? (
            <EmptyMarketplace onReset={resetFilters} hasFilters={activeFilters} />
          ) : (
            <>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
                {displayed.map((skin) => {
                  const { SkinCard } = require("@/components/skin-card")
                  return (
                    <SkinCard
                      key={skin.id}
                      skin={skin}
                      onInspect={setInspecting}
                      onSell={skin.owner === "me" ? setSelling : undefined}
                      onOffer={skin.owner !== "me" ? setOffering : undefined}
                    />
                  )
                })}
              </div>
              {hasMore && (
                <div className="flex flex-col items-center gap-2 pt-4">
                  <p className="text-xs text-muted-foreground">
                    {t("items.showing", { shown: displayed.length, total: visible.length })}
                  </p>
                  <Button variant="outline" className="border-border bg-card px-8"
                    onClick={() => setVisibleCount(c => c + PAGE_SIZE)}>
                    {t("items.loadMore")}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <InspectDialog skin={inspecting} onClose={() => setInspecting(null)} />
      <SellDialog skin={selling} onClose={() => setSelling(null)} />
      <OfferDialog skin={offering} onClose={() => setOffering(null)} />

      <a href={`mailto:${SUPPORT_EMAIL}`}
        className="fixed bottom-3 left-3 z-30 flex items-center gap-1.5 text-[11px] text-muted-foreground/60 transition-colors hover:text-muted-foreground">
        <LifeBuoy className="h-3.5 w-3.5" />
        {t("support.text")}
      </a>
    </div>
  )
}
