"use client"

import { useMemo, useState } from "react"
import { LifeBuoy, PackageOpen, Search, SlidersHorizontal } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SiteHeader } from "@/components/site-header"
import { LiveTicker } from "@/components/live-ticker"
import { FilterSidebar, type Filters } from "@/components/filter-sidebar"
import { SkinCard } from "@/components/skin-card"
import { InspectDialog } from "@/components/inspect-dialog"
import { SellDialog } from "@/components/sell-dialog"
import { categoryOf, CURRENT_USER, skins, type Skin } from "@/lib/skins"
import { useI18n } from "@/lib/i18n"

const DEFAULT_FILTERS: Filters = {
  sort: "popular",
  st: false,
  sv: false,
  exterior: "all",
  category: null,
  weapon: null,
  rarity: null,
}

export function Marketplace() {
  const { t } = useI18n()
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [search, setSearch] = useState("")
  const [myListings, setMyListings] = useState(false)
  const [inspecting, setInspecting] = useState<Skin | null>(null)
  const [selling, setSelling] = useState<Skin | null>(null)
  const [supportOpen, setSupportOpen] = useState(false)

  const visible = useMemo(() => {
    let list = [...skins]

    if (myListings) list = list.filter((s) => s.owner === "me")

    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (s) => s.title.toLowerCase().includes(q) || s.type.toLowerCase().includes(q),
      )
    }

    if (filters.category) list = list.filter((s) => categoryOf(s.type) === filters.category)
    if (filters.weapon) list = list.filter((s) => s.type === filters.weapon)
    if (filters.rarity) list = list.filter((s) => s.rarity === filters.rarity)
    if (filters.st) list = list.filter((s) => s.isST)
    if (filters.sv) list = list.filter((s) => s.isSV)
    if (filters.exterior !== "all") list = list.filter((s) => s.exterior === filters.exterior)

    switch (filters.sort) {
      case "popular":
        list.sort((a, b) => b.popularity - a.popularity)
        break
      case "discount-desc":
        list.sort((a, b) => b.discount - a.discount)
        break
      case "price-asc":
        list.sort((a, b) => a.price - b.price)
        break
      case "price-desc":
        list.sort((a, b) => b.price - a.price)
        break
      case "float-asc":
        list.sort((a, b) => a.float - b.float)
        break
      case "float-desc":
        list.sort((a, b) => b.float - a.float)
        break
    }

    return list
  }, [filters, search, myListings])

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS)
    setSearch("")
    setMyListings(false)
  }

  return (
    <div className="min-h-screen pb-16">
      <LiveTicker />
      <SiteHeader onResetFilters={resetFilters} onShowMyListings={() => setMyListings(true)} />

      <div className="mx-auto grid max-w-[1600px] gap-6 px-4 py-6 md:grid-cols-[280px_1fr] md:px-10">
        <aside className="hidden h-fit rounded-xl border border-border bg-card p-6 md:block">
          <FilterSidebar filters={filters} onChange={setFilters} />
        </aside>

        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
                <div className="mt-6">
                  <FilterSidebar filters={filters} onChange={setFilters} />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {(myListings ||
            filters.st ||
            filters.sv ||
            filters.exterior !== "all" ||
            filters.category ||
            filters.weapon ||
            filters.rarity ||
            search) && (
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

          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-20 text-center">
              <PackageOpen className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("empty.title")}</p>
              <Button variant="outline" size="sm" onClick={resetFilters} className="border-border bg-input">
                {t("empty.reset")}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
              {visible.map((skin) => (
                <SkinCard
                  key={skin.id}
                  skin={skin}
                  onInspect={setInspecting}
                  onSell={setSelling}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <InspectDialog skin={inspecting} onClose={() => setInspecting(null)} />
      <SellDialog skin={selling} onClose={() => setSelling(null)} />

      {/* Support Dialog */}
      <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
        <DialogContent className="border-border bg-card sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <LifeBuoy className="h-5 w-5 text-primary" />
              {t("support.title")}
            </DialogTitle>
            <DialogDescription>{t("support.desc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground py-2">
            <p>{t("support.hours")}</p>
            <a
              href="mailto:support@skinapex.gg"
              className="block font-semibold text-primary hover:underline"
            >
              support@skinapex.gg
            </a>
            <a
              href="https://steamcommunity.com/groups/skinapex"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-semibold text-[#66c0f4] hover:underline"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M11.98 0C5.67 0 .5 4.87.02 11.06l6.43 2.66a3.4 3.4 0 0 1 1.92-.59l2.86-4.15v-.06a4.54 4.54 0 1 1 4.54 4.54h-.1l-4.08 2.92.01.4a3.41 3.41 0 0 1-6.76.66L.07 15.4C1.52 20.4 6.32 24 11.98 24 18.62 24 24 18.63 24 12S18.62 0 11.98 0z" />
              </svg>
              {t("support.steamGroup")}
            </a>
          </div>
        </DialogContent>
      </Dialog>

      <button
        onClick={() => setSupportOpen(true)}
        className="fixed bottom-3 left-3 z-30 flex items-center gap-1.5 text-[11px] text-muted-foreground/60 transition-colors hover:text-muted-foreground"
      >
        <LifeBuoy className="h-3.5 w-3.5" />
        {t("support.text")}
      </button>
    </div>
  )
}
