"use client"

import { useEffect, useMemo, useState } from "react"
import { LifeBuoy, Search, SlidersHorizontal, Tag } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { SiteHeader } from "@/components/site-header"
import { LiveTicker } from "@/components/live-ticker"
import { SiteFooter } from "@/components/site-footer"
import { FilterSidebar, type Filters, FLOAT_FILTER_MAX, FLOAT_FILTER_MIN, PRICE_FILTER_MAX } from "@/components/filter-sidebar"
import { isFloatFilterActive } from "@/lib/float-wear"
import { SkinCard } from "@/components/skin-card"
import { InspectDialog } from "@/components/inspect-dialog"
import { SellDialog } from "@/components/sell-dialog"
import { OfferDialog } from "@/components/offer-dialog"
import { listingToSkin } from "@/lib/listing-to-skin"
import { categoryOf, type Skin } from "@/lib/skins"
import { useI18n } from "@/lib/i18n"
import { cancelListing, getActiveListings, subscribeListings, syncListings, type Listing } from "@/lib/listings"
import { SavedFiltersControl } from "@/components/saved-filters-control"
import { toast } from "sonner"

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
  floatMin: FLOAT_FILTER_MIN,
  floatMax: FLOAT_FILTER_MAX,
}

const PAGE_SIZE = 48
const SUPPORT_EMAIL = "support@skinapex.net"

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
          <p className="max-w-xs text-xs text-muted-foreground">
            İlk ilanı sen aç! Steam envanterinden bir ürünü profilinden listeleyebilirsin.
          </p>
        </>
      )}
    </div>
  )
}

export function Marketplace() {
  const { t } = useI18n()
  const { steamProfile, isLoadingItems } = useMarket()

  const [listings, setListings] = useState<Listing[]>(() => getActiveListings())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    syncListings().finally(() => { if (!cancelled) setLoading(false) })
    const unsub = subscribeListings(() => setListings([...getActiveListings()]))
    return () => { cancelled = true; unsub() }
  }, [])

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [myListingsOnly, setMyListingsOnly] = useState(false)
  const [search, setSearch] = useState("")
  const [inspecting, setInspecting] = useState<Skin | null>(null)
  const [selling, setSelling] = useState<Skin | null>(null)
  const [offering, setOffering] = useState<Skin | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const allSkins = useMemo(() => listings.map(listingToSkin), [listings, isLoadingItems])

  const visible = useMemo(() => {
    let list = [...allSkins]

    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (s) => s.title.toLowerCase().includes(q) || s.type.toLowerCase().includes(q),
      )
    }

    if (myListingsOnly && steamProfile?.steamId) {
      list = list.filter((s) => s.sellerId === steamProfile.steamId)
    }

    if (filters.category) list = list.filter((s) => categoryOf(s.type) === filters.category)
    if (filters.weapon) list = list.filter((s) => s.type === filters.weapon)
    if (filters.rarity) list = list.filter((s) => s.rarity === filters.rarity)
    if (filters.st) list = list.filter((s) => s.isST)
    if (filters.sv) list = list.filter((s) => s.isSV)
    if (filters.exterior !== "all") list = list.filter((s) => s.exterior === filters.exterior)
    if (filters.priceMin > 0 || filters.priceMax < PRICE_FILTER_MAX) {
      list = list.filter((s) => s.price >= filters.priceMin && s.price <= filters.priceMax)
    }
    if (isFloatFilterActive(filters.floatMin, filters.floatMax)) {
      list = list.filter(
        (s) =>
          s.hasFloat !== false &&
          s.float >= filters.floatMin &&
          s.float <= filters.floatMax,
      )
    }

    switch (filters.sort) {
      case "all": break
      case "popular": list.sort((a, b) => b.popularity - a.popularity); break
      case "newest": list.sort((a, b) => b.listedAt - a.listedAt); break
      case "discount-desc": list.sort((a, b) => b.discount - a.discount); break
      case "price-asc": list.sort((a, b) => a.price - b.price); break
      case "price-desc": list.sort((a, b) => b.price - a.price); break
      case "float-asc": list.sort((a, b) => a.float - b.float); break
      case "float-desc": list.sort((a, b) => b.float - a.float); break
    }

    return list
  }, [allSkins, filters, search, myListingsOnly, steamProfile?.steamId])

  const displayed = visible.slice(0, visibleCount)
  const hasMore = visibleCount < visible.length

  const activeFilters =
    filters.st || filters.sv || filters.exterior !== "all" ||
    !!filters.category || !!filters.weapon || !!filters.rarity ||
    filters.priceMin > 0 || filters.priceMax < PRICE_FILTER_MAX ||
    isFloatFilterActive(filters.floatMin, filters.floatMax) || !!search

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS)
    setSearch("")
    setVisibleCount(PAGE_SIZE)
  }

  const handleDelist = async (skin: Skin) => {
    if (!skin.listingId || !steamProfile?.steamId) return
    const ok = await cancelListing(skin.listingId)
    if (ok) {
      toast.success(t("sell.unpublished"))
    } else {
      toast.error(t("sell.unpublishFailed"))
    }
  }

  return (
    <div className="min-h-screen pb-16">
      <LiveTicker />
      <SiteHeader
        onResetFilters={() => { resetFilters(); setMyListingsOnly(false) }}
        onShowMyListings={() => {
          if (!steamProfile?.steamId) {
            toast.error("Giriş yapmanız gerekiyor")
            return
          }
          resetFilters()
          setMyListingsOnly(true)
        }}
      />

      <div className="mx-auto grid max-w-[1600px] gap-6 px-4 py-6 md:grid-cols-[280px_1fr] md:px-10">
        <aside className="hidden md:block">
          <div className="scrollbar-skinapex sticky top-[64px] max-h-[calc(100vh-80px)] overflow-y-auto rounded-xl border border-border bg-card p-6">
            <FilterSidebar
              filters={filters}
              listedItems={allSkins}
              onChange={(f) => { setFilters(f); setVisibleCount(PAGE_SIZE) }}
              onReset={resetFilters}
            />
          </div>
        </aside>

        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE) }}
                placeholder={t("search.placeholder")}
                className="h-12 border-border bg-card pl-11 pr-3 pb-7 text-base text-foreground placeholder:text-muted-foreground"
              />
              <SavedFiltersControl
                filters={filters}
                search={search}
                onApply={(preset) => {
                  setFilters(preset.filters)
                  setSearch(preset.search)
                  setVisibleCount(PAGE_SIZE)
                }}
                className="absolute bottom-1.5 right-2.5"
              />
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="h-12 shrink-0 border-border bg-card md:hidden"
                  aria-label={t("search.openFilters")}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="border-border bg-card"
                onPointerDownOutside={(e) => e.preventDefault()}
                onInteractOutside={(e) => e.preventDefault()}
              >
                <SheetTitle className="sr-only">{t("filter.title")}</SheetTitle>
                <SheetDescription className="sr-only">{t("filter.title")}</SheetDescription>
                <div className="scrollbar-skinapex mt-6 max-h-[calc(100vh-7rem)] overflow-y-auto pr-1">
                  <FilterSidebar
                    filters={filters}
                    listedItems={allSkins}
                    onChange={(f) => { setFilters(f); setVisibleCount(PAGE_SIZE) }}
                    onReset={resetFilters}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {activeFilters && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                {t(visible.length === 1 ? "results.count_one" : "results.count", { n: visible.length })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                {t("results.clearAll")}
              </Button>
            </div>
          )}

          {myListingsOnly && steamProfile && (
            <p className="text-xs font-semibold text-primary">
              {t("results.myListings", { name: steamProfile.steamName ?? steamProfile.steamId })}
            </p>
          )}

          {!activeFilters && !myListingsOnly && listings.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("results.count", { n: visible.length })} {t("items.total")}
            </p>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              {t("items.loading")}
            </div>
          ) : visible.length === 0 ? (
            <EmptyMarketplace onReset={resetFilters} hasFilters={activeFilters} />
          ) : (
            <>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
                {displayed.map((skin) => (
                  <SkinCard
                    key={skin.listingId ?? skin.id}
                    skin={skin}
                    onInspect={setInspecting}
                    onOffer={setOffering}
                    onDelist={handleDelist}
                  />
                ))}
              </div>
              {hasMore && (
                <div className="flex flex-col items-center gap-2 pt-4">
                  <p className="text-xs text-muted-foreground">
                    {t("items.showing", { shown: displayed.length, total: visible.length })}
                  </p>
                  <Button
                    variant="outline"
                    className="border-border bg-card px-8"
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  >
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

      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className="fixed bottom-3 left-3 z-30 flex items-center gap-1.5 text-[11px] text-muted-foreground/60 transition-colors hover:text-muted-foreground"
      >
        <LifeBuoy className="h-3.5 w-3.5" />
        {t("support.text")}
      </a>

      <SiteFooter />
    </div>
  )
}
