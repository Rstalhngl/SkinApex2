"use client"

import { RotateCcw, SlidersHorizontal } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { FloatRangeFilter } from "@/components/float-wear-bar"
import { FLOAT_MAX, FLOAT_MIN } from "@/lib/float-wear"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import {
  CATEGORIES, getListedWeaponsInCategory, RARITIES,
  type CategoryKey, type Rarity, type Skin,
} from "@/lib/skins"

export type SortKey =
  | "all"
  | "popular"
  | "newest"
  | "discount-desc"
  | "price-asc"
  | "price-desc"
  | "float-asc"
  | "float-desc"
export type ExteriorFilter = "all" | "FN" | "MW" | "FT" | "WW" | "BS"

export interface Filters {
  sort: SortKey
  st: boolean
  sv: boolean
  exterior: ExteriorFilter
  category: CategoryKey | null
  weapon: string | null
  rarity: Rarity | null
  priceMin: number
  priceMax: number
  floatMin: number
  floatMax: number
}

export const FLOAT_FILTER_MIN = FLOAT_MIN
export const FLOAT_FILTER_MAX = FLOAT_MAX

export const PRICE_FILTER_MAX = 200000 // TRY

export function FilterSidebar({
  filters,
  listedItems = [],
  onChange,
  onReset,
}: {
  filters: Filters
  listedItems?: Pick<Skin, "type" | "title" | "marketHashName">[]
  onChange: (filters: Filters) => void
  onReset?: () => void
}) {
  const { t } = useI18n()
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })
  const listedWeapons = filters.category
    ? getListedWeaponsInCategory(filters.category, listedItems)
    : []

  return (
    <div className="space-y-6">
      <h3 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-foreground">
        <SlidersHorizontal className="h-4 w-4 text-primary" />
        {t("filter.title")}
      </h3>


      {/* Price range filter */}
      <div className="space-y-2">
        <Label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {t("filter.categories")}
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((c) => {
            const active = filters.category === c.key
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => set({ category: active ? null : c.key, weapon: null })}
                aria-pressed={active}
                title={t(`category.${c.key}`)}
                className={cn(
                  "group flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors",
                  active
                    ? "border-primary bg-primary/10"
                    : "border-border bg-input hover:border-primary/50",
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.icon || "/placeholder.svg"}
                    alt={t(`category.${c.key}`)}
                    className={cn(
                      "max-h-full max-w-full object-contain transition-opacity",
                      active ? "opacity-100" : "opacity-70 group-hover:opacity-100",
                    )}
                  />
                </span>
                <span
                  className={cn(
                    "text-[9px] font-semibold leading-tight",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {t(`category.${c.key}`)}
                </span>
              </button>
            )
          })}
        </div>

        {filters.category && listedWeapons.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {listedWeapons.map((w) => {
              const active = filters.weapon === w
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => set({ weapon: active ? null : w })}
                  aria-pressed={active}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-input text-muted-foreground hover:border-primary/50 hover:text-foreground",
                  )}
                >
                  {w}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {t("filter.sortBy")}
        </Label>
        <Select value={filters.sort} onValueChange={(v) => set({ sort: v as SortKey })}>
          <SelectTrigger className="border-border bg-input text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-border bg-card">
            <SelectItem value="all">{t("filter.sort.all")}</SelectItem>
            <SelectItem value="popular">{t("filter.sort.popular")}</SelectItem>
            <SelectItem value="newest">{t("filter.sort.newest")}</SelectItem>
            <SelectItem value="discount-desc">{t("filter.sort.discount")}</SelectItem>
            <SelectItem value="price-asc">{t("filter.sort.priceAsc")}</SelectItem>
            <SelectItem value="price-desc">{t("filter.sort.priceDesc")}</SelectItem>
            <SelectItem value="float-asc">{t("filter.sort.floatAsc")}</SelectItem>
            <SelectItem value="float-desc">{t("filter.sort.floatDesc")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Price range filter — below sort */}
      <div className="space-y-2">
        <Label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {t("filter.priceRange")}
        </Label>
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">₺</span>
            <Input
              type="number"
              min={0}
              max={filters.priceMax}
              value={filters.priceMin || ""}
              onChange={e => {
                const v = parseInt(e.target.value) || 0
                set({ priceMin: Math.min(v, filters.priceMax) })
              }}
              placeholder="Min"
              className="h-7 border-border bg-input pl-5 text-[11px] text-foreground"
            />
          </div>
          <span className="text-[10px] text-muted-foreground">–</span>
          <div className="relative flex-1">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">₺</span>
            <Input
              type="number"
              min={filters.priceMin}
              max={PRICE_FILTER_MAX}
              value={filters.priceMax >= PRICE_FILTER_MAX ? "" : filters.priceMax}
              onChange={e => {
                const v = parseInt(e.target.value)
                set({ priceMax: isNaN(v) ? PRICE_FILTER_MAX : Math.max(v, filters.priceMin) })
              }}
              placeholder="Max"
              className="h-7 border-border bg-input pl-5 text-[11px] text-foreground"
            />
          </div>
        </div>
        <Slider
          min={0}
          max={PRICE_FILTER_MAX}
          step={500}
          value={[filters.priceMin, filters.priceMax]}
          onValueChange={([min, max]) => set({ priceMin: min, priceMax: max })}
          className="mt-1"
        />
        {(filters.priceMin > 0 || filters.priceMax < PRICE_FILTER_MAX) && (
          <p className="text-[10px] text-muted-foreground">
            ₺{filters.priceMin.toLocaleString("tr-TR")} – {filters.priceMax >= PRICE_FILTER_MAX ? "₺200.000+" : "₺" + filters.priceMax.toLocaleString("tr-TR")}
          </p>
        )}
      </div>

      <FloatRangeFilter
        floatMin={filters.floatMin}
        floatMax={filters.floatMax}
        onChange={(patch) => set(patch)}
        wearLabel={t("filter.wear")}
        minLabel={t("filter.floatMin")}
        maxLabel={t("filter.floatMax")}
      />

      <div className="space-y-2">
        <Label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {t("filter.rarity")}
        </Label>
        <div className="flex flex-col gap-1.5">
          {RARITIES.map((r) => {
            const active = filters.rarity === r.key
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => set({ rarity: active ? null : r.key })}
                aria-pressed={active}
                className={cn(
                  "flex items-center gap-2.5 rounded-md border px-2.5 py-1.5 text-left text-xs font-semibold transition-colors",
                  active
                    ? "border-transparent text-white"
                    : "border-border bg-input text-muted-foreground hover:text-foreground",
                )}
                style={
                  active
                    ? { backgroundColor: r.color, borderColor: r.color }
                    : undefined
                }
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full ring-1 ring-inset ring-black/20"
                  style={{ backgroundColor: r.color }}
                  aria-hidden="true"
                />
                {t(`rarity.${r.key}`)}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {t("filter.attributes")}
        </Label>
        <CheckRow
          id="filter-st"
          checked={filters.st}
          onChange={(v) => set({ st: v })}
          color="stattrak"
          label={t("filter.stattrak")}
        />
        <CheckRow
          id="filter-sv"
          checked={filters.sv}
          onChange={(v) => set({ sv: v })}
          color="souvenir"
          label={t("filter.souvenir")}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {t("filter.exteriorQuality")}
        </Label>
        <Select value={filters.exterior} onValueChange={(v) => set({ exterior: v as ExteriorFilter })}>
          <SelectTrigger className="border-border bg-input text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-border bg-card">
            <SelectItem value="all">{t("filter.exterior.all")}</SelectItem>
            <SelectItem value="FN">{t("exterior.FN.full")}</SelectItem>
            <SelectItem value="MW">{t("exterior.MW.full")}</SelectItem>
            <SelectItem value="FT">{t("exterior.FT.full")}</SelectItem>
            <SelectItem value="WW">{t("exterior.WW.full")}</SelectItem>
            <SelectItem value="BS">{t("exterior.BS.full")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reset button at bottom */}
      {onReset && (
        <button
          onClick={onReset}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 py-1.5 text-[11px] font-semibold text-destructive transition-colors hover:bg-destructive/20"
        >
          <RotateCcw className="h-3 w-3" />
          {t("filter.reset")}
        </button>
      )}
    </div>
  )
}

function CheckRow({
  id,
  checked,
  onChange,
  color,
  label,
}: {
  id: string
  checked: boolean
  onChange: (v: boolean) => void
  color: "stattrak" | "souvenir"
  label: string
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onChange(Boolean(v))}
        className={cn(
          "border-border data-[state=checked]:border-transparent data-[state=checked]:text-black",
          color === "stattrak" && "data-[state=checked]:bg-stattrak",
          color === "souvenir" && "data-[state=checked]:bg-souvenir",
        )}
      />
      <Label htmlFor={id} className="cursor-pointer text-sm font-semibold text-foreground">
        {label}
      </Label>
    </div>
  )
}
