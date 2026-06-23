import type { Exterior } from "@/lib/skins"
import { categoryOf, resolveItemType } from "@/lib/skins"

const PHASE_MAP: Record<string, string> = {
  am_doppler_phase1: "Phase 1",
  am_doppler_phase2: "Phase 2",
  am_doppler_phase3: "Phase 3",
  am_doppler_phase4: "Phase 4",
  am_ruby_marbleized: "Ruby",
  am_sapphire_marbleized: "Sapphire",
  am_blackpearl_marbleized: "Black Pearl",
  am_gamma_doppler_phase1: "Phase 1",
  am_gamma_doppler_phase2: "Phase 2",
  am_gamma_doppler_phase3: "Phase 3",
  am_gamma_doppler_phase4: "Phase 4",
  am_emerald_marbleized: "Emerald",
}

const GEM_PHASES = ["Ruby", "Sapphire", "Emerald", "Black Pearl"] as const

const EXT_FLOAT_MID: Record<Exterior, number> = {
  FN: 0.035,
  MW: 0.11,
  FT: 0.265,
  WW: 0.415,
  BS: 0.72,
}

export interface AssetWearProperties {
  float?: number
  patternSeed?: number
}

export function parseAssetWear(
  assetProperties?: { propertyid: number; int_value?: string; float_value?: string }[],
): AssetWearProperties {
  const result: AssetWearProperties = {}
  for (const prop of assetProperties ?? []) {
    if (prop.propertyid === 2 && prop.float_value != null) {
      const value = Number.parseFloat(prop.float_value)
      if (Number.isFinite(value)) result.float = value
    }
    if (prop.propertyid === 1 && prop.int_value != null) {
      const value = Number.parseInt(prop.int_value, 10)
      if (Number.isFinite(value)) result.patternSeed = value
    }
  }
  return result
}

export function extractPhaseFromTags(
  tags?: { category: string; internal_name: string; localized_tag_name: string }[],
): string | undefined {
  for (const tag of tags ?? []) {
    const mapped = PHASE_MAP[tag.internal_name]
    if (mapped) return mapped
    if (tag.category === "Phase" && tag.localized_tag_name) return tag.localized_tag_name
  }
  return undefined
}

export function extractPhaseFromName(name?: string, marketHashName?: string): string | undefined {
  for (const source of [name, marketHashName]) {
    if (!source) continue
    for (const gem of GEM_PHASES) {
      if (source.includes(gem)) return gem
    }
    const phaseMatch = source.match(/\bPhase\s*([1-4])\b/i)
    if (phaseMatch) return `Phase ${phaseMatch[1]}`
  }
  return undefined
}

export function resolveItemPhase(
  tags?: { category: string; internal_name: string; localized_tag_name: string }[],
  name?: string,
  marketHashName?: string,
): string | undefined {
  return extractPhaseFromTags(tags) ?? extractPhaseFromName(name, marketHashName)
}

export function itemHasFloat(type: string, name?: string, marketHashName?: string): boolean {
  const resolved = resolveItemType(type, name, marketHashName)
  const category = categoryOf(resolved)
  if (category === "sticker" || category === "agent" || category === "music") return false
  if (resolved === "Sticker" || resolved === "Agent" || resolved === "Music Kit") return false
  return true
}

export function exteriorToFloat(exterior: Exterior): number {
  return EXT_FLOAT_MID[exterior] ?? EXT_FLOAT_MID.FT
}

export function resolveListingFloat(
  exterior: Exterior,
  storedFloat?: number,
  hasFloat = true,
): number {
  if (!hasFloat) return 0
  if (storedFloat != null && Number.isFinite(storedFloat)) return storedFloat
  return exteriorToFloat(exterior)
}
