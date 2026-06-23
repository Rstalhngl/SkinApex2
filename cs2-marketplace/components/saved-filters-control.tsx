"use client"

import { useEffect, useState } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  SavedFiltersIcon,
  searchBarIconButtonClass,
} from "@/components/search-bar-icons"
import type { Filters } from "@/components/filter-sidebar"
import {
  deleteFilterPreset,
  listSavedFilters,
  saveFilterPreset,
  type SavedFilterPreset,
} from "@/lib/saved-filters"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface SavedFiltersControlProps {
  filters: Filters
  search: string
  onApply: (preset: SavedFilterPreset) => void
  className?: string
}

export function SavedFiltersControl({
  filters,
  search,
  onApply,
  className,
}: SavedFiltersControlProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [presets, setPresets] = useState<SavedFilterPreset[]>([])
  const [name, setName] = useState("")

  const refresh = () => setPresets(listSavedFilters())

  useEffect(() => {
    if (open) refresh()
  }, [open])

  const handleSave = () => {
    const result = saveFilterPreset(name, filters, search)
    if (result === "empty") {
      toast.error(t("savedFilters.nameRequired"))
      return
    }
    if (result === "duplicate") {
      toast.error(t("savedFilters.duplicate"))
      return
    }
    toast.success(t("savedFilters.saved"), { description: result.name })
    setName("")
    refresh()
  }

  const handleApply = (preset: SavedFilterPreset) => {
    onApply(preset)
    setOpen(false)
    toast.success(t("savedFilters.applied"), { description: preset.name })
  }

  const handleDelete = (id: string) => {
    deleteFilterPreset(id)
    refresh()
    toast.success(t("savedFilters.deleted"))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("savedFilters.title")}
          title={t("savedFilters.title")}
          className={cn(searchBarIconButtonClass, className)}
        >
          <SavedFiltersIcon />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 border-border bg-card p-3">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-bold text-foreground">{t("savedFilters.title")}</p>
            <p className="text-[10px] text-muted-foreground">{t("savedFilters.subtitle")}</p>
          </div>

          {presets.length > 0 ? (
            <ul className="max-h-36 space-y-1 overflow-y-auto scrollbar-skinapex pr-0.5">
              {presets.map((preset) => (
                <li
                  key={preset.id}
                  className="flex items-center gap-1 rounded-md border border-border bg-input/60 p-1"
                >
                  <button
                    type="button"
                    onClick={() => handleApply(preset)}
                    className="min-w-0 flex-1 truncate px-1.5 py-1 text-left text-[11px] font-semibold text-foreground hover:text-primary"
                  >
                    {preset.name}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(preset.id)}
                    aria-label={t("savedFilters.delete")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md border border-dashed border-border px-2 py-3 text-center text-[10px] text-muted-foreground">
              {t("savedFilters.empty")}
            </p>
          )}

          <div className="space-y-1.5 border-t border-border pt-3">
            <Label htmlFor="saved-filter-name" className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {t("savedFilters.nameLabel")}
            </Label>
            <div className="flex gap-1.5">
              <Input
                id="saved-filter-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                placeholder={t("savedFilters.namePlaceholder")}
                className="h-8 border-border bg-input text-xs"
              />
              <Button
                type="button"
                size="sm"
                className="h-8 shrink-0 px-3 text-[10px] font-bold uppercase"
                onClick={handleSave}
              >
                {t("savedFilters.save")}
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
