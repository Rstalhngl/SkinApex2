import type { Filters } from "@/components/filter-sidebar"

const STORAGE_KEY = "skinapex-saved-filters"
const MAX_PRESETS = 12

export interface SavedFilterPreset {
  id: string
  name: string
  filters: Filters
  search: string
  createdAt: number
}

function readAll(): SavedFilterPreset[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedFilterPreset[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(presets: SavedFilterPreset[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
}

export function listSavedFilters(): SavedFilterPreset[] {
  return readAll().sort((a, b) => b.createdAt - a.createdAt)
}

export function saveFilterPreset(
  name: string,
  filters: Filters,
  search: string,
): SavedFilterPreset | "duplicate" | "empty" {
  const trimmed = name.trim()
  if (!trimmed) return "empty"

  const presets = readAll()
  const duplicate = presets.some(
    (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
  )
  if (duplicate) return "duplicate"

  const preset: SavedFilterPreset = {
    id: `sf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: trimmed,
    filters: { ...filters },
    search: search.trim(),
    createdAt: Date.now(),
  }

  const next = [preset, ...presets].slice(0, MAX_PRESETS)
  writeAll(next)
  return preset
}

export function deleteFilterPreset(id: string): void {
  writeAll(readAll().filter((p) => p.id !== id))
}
