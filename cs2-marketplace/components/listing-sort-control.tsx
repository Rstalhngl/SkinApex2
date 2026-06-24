"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { SortKey } from "@/components/filter-sidebar"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

interface ListingSortControlProps {
  sort: SortKey
  onChange: (sort: SortKey) => void
  className?: string
}

export function ListingSortControl({ sort, onChange, className }: ListingSortControlProps) {
  const { t } = useI18n()

  return (
    <Select value={sort} onValueChange={(v) => onChange(v as SortKey)}>
      <SelectTrigger
        aria-label={t("filter.sortBy")}
        className={cn(
          "h-8 w-[9.5rem] gap-1 rounded-md border border-primary/25 bg-primary/10 px-2 text-[11px] font-semibold text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-primary/45 hover:bg-primary/15 [&>svg]:text-primary",
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end" className="border-border bg-card">
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
  )
}
