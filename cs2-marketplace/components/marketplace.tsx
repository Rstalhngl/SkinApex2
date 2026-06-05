"use client"

import { useMemo, useState } from "react"
import { LifeBuoy, PackageOpen, Search, SlidersHorizontal } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle,
  SheetDescription, SheetTrigger } from "@/components/ui/sheet"
import { SiteHeader } from "@/components/site-header"
import { LiveTicker } from "@/components/live-ticker"
import { FilterSidebar, type Filters } from "@/components/filter-sidebar"
import { SkinCard } from "@/components/skin-card"
import { InspectDialog } from "@/components/inspect-dialog"
import { SellDialog } from "@/components/sell-dialog"
import { OfferDialog } from "@/components/offer-dialog"
import { useMarket } from "@/components/market-provider"
import { categoryOf, CURRENT_USER, type Skin } from "@/lib/skins"
import { useI18n } from "@/lib/i18n"

const DEFAULT_FILTERS: Filters = {
  sort: "popular",
  st: false,
  sv: false,
  exterior: "all",
  category: null,
  weapon: null,
  rarity: null,
  priceMin: 0,
  priceMax: 200000,
}

const PAGE_SIZE = 48
const SUPPORT_EMAIL = "support@skinapex.net"

// ─── Loading skeleton ────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card p-4 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-3 w-12 rounded bg-border" />
        <div className="h-3 w-10 rounded bg-border" />
      </div>
      <div className="my-2.5 flex h-[120px] items-center justify-center rounded-lg bg-input" />
      <div className="mb-3 space-y-1.5">
        <div className="h-1 w-full rounded-full bg-border" />
        <div className="flex justify-between">
          <div className="h-3 w-10 rounded bg-border" />
          <div className="h-3 w-12 rounded bg-border" />
        </div>
      </div>
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

// ─── Main component ──────────────────────────────────────────────────────────

export function Marketplace() {
  const { t } = useI18n()
  const { items, isLoadingItems } = useMarket()

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [search, setSearch] = useState("")
  const [myListings, setMyListings] = useState(false)
  const [inspecting, setInspecting] = useState<Skin | null>(null)
  const [selling, setSelling] = useState<Skin | null>(null)
  const [offering, setOffering] = useState<Skin | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const visible = useMemo(() => {
    let list = [...items]

    if (myListings) {
      list = list.filter((s) => s.owner === "me")
    } else {
      // Marketplace shows only items available for purchase (not owned by current user)
      list = list.filter((s) => s.owner !== "me")
    }

    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.type.toLowerCase().includes(q),
      )
    }

    if (filters.category) list = list.filter((s) => categoryOf(s.type) === filters.category)
    if (filters.weapon) list = list.filter((s) => s.type === filters.weapon)
    if (filters.rarity) list = list.filter((s) => s.rarity === filters.rarity)
    if (filters.priceMin > 0 || filters.priceMax < 200000) {
      list = list.filter((s) => s.price >= filters.priceMin && s.price <= filters.priceMax)
    }
    if (filters.st) list = list.filter((s) => s.isST)
    if (filters.sv) list = list.filter((s) => s.isSV)
    if (filters.exterior !== "all") list = list.filter((s) => s.exterior === filters.exterior)

    switch (filters.sort) {
      case "popular":      list.sort((a, b) => b.popularity - a.popularity); break
      case "newest":       list.sort((a, b) => b.listedAt - a.listedAt); break
      case "discount-desc":list.sort((a, b) => b.discount - a.discount); break
      case "price-asc":    list.sort((a, b) => a.price - b.price); break
      case "price-desc":   list.sort((a, b) => b.price - a.price); break
      case "float-asc":    list.sort((a, b) => a.float - b.float); break
      case "float-desc":   list.sort((a, b) => b.float - a.float); break
    }

    return list
  }, [filters, search, myListings, items])

  const displayed = visible.slice(0, visibleCount)
  const hasMore = visibleCount < visible.length

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS)
    setSearch("")
    setMyListings(false)
    setVisibleCount(PAGE_SIZE)
  }

  const activeFilters =
    myListings ||
    filters.st ||
    filters.sv ||
    filters.exterior !== "all" ||
    !!filters.category ||
    !!filters.weapon ||
    !!filters.rarity ||
    filters.priceMin > 0 ||
    filters.priceMax < 200000 ||
    !!search

  return (
    <div className="min-h-screen pb-16">
      <LiveTicker />
      <SiteHeader onResetFilters={resetFilters} onShowMyListings={() => setMyListings(true)} />

      <div className="mx-auto grid max-w-[1600px] gap-6 px-4 py-6 md:grid-cols-[280px_1fr] md:px-10">
        <aside className="hidden md:block">
          <div className="sticky top-[64px] max-h-[calc(100vh-80px)] overflow-y-auto rounded-xl border border-border bg-card p-6 scrollbar-thin">
          <FilterSidebar filters={filters} onChange={(f) => { setFilters(f); setVisibleCount(PAGE_SIZE) }} onReset={resetFilters} />
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
                <Button
                  variant="outline"
                  className="h-12 shrink-0 border-border bg-card md:hidden"
                  aria-label={t("search.openFilters")}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="border-border bg-card">
                <SheetTitle className="sr-only">{t("filter.title")}</SheetTitle>
                <SheetDescription className="sr-only">Filtre paneli</SheetDescription><div className="mt-6">
                  <FilterSidebar filters={filters} onChange={(f) => { setFilters(f); setVisibleCount(PAGE_SIZE) }} onReset={resetFilters} />
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
              {myListings && (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {t("results.myListings", { name: CURRENT_USER.name })}
                </span>
              )}
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

          {/* Loading state */}
          {isLoadingItems ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                {t("items.loading")}
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
                {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-20 text-center">
              <PackageOpen className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("empty.title")}</p>
              <Button variant="outline" size="sm" onClick={resetFilters} className="border-border bg-input">
                {t("empty.reset")}
              </Button>
            </div>
          ) : (
            <>
              {/* Item count when no active filters */}
              {!activeFilters && (
                <p className="text-xs text-muted-foreground">
                  {t("results.count", { n: visible.length })} {t("items.total")}
                </p>
              )}

              <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
                {displayed.map((skin) => (
                  <SkinCard
                    key={skin.id}
                    skin={skin}
                    onInspect={setInspecting}
                    onSell={setSelling}
                  />
                ))}
              </div>

              {/* Load More */}
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
    </div>
  )
}
