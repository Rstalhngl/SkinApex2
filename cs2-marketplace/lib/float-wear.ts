/** CS2 wear float boundaries (0–1). */
export const FLOAT_MIN = 0
export const FLOAT_MAX = 1

export type WearAbbrev = "FN" | "MW" | "FT" | "WW" | "BS"

export interface WearBand {
  key: WearAbbrev
  min: number
  max: number
}

export const WEAR_BANDS: WearBand[] = [
  { key: "FN", min: 0, max: 0.07 },
  { key: "MW", min: 0.07, max: 0.15 },
  { key: "FT", min: 0.15, max: 0.38 },
  { key: "WW", min: 0.38, max: 0.45 },
  { key: "BS", min: 0.45, max: 1 },
]

/** Multi-segment wear gradient matching CS market float bar. */
export const WEAR_GRADIENT =
  "linear-gradient(90deg,#22c55e 0%,#22c55e 7%,#84cc16 7%,#84cc16 15%,#eab308 15%,#eab308 38%,#f97316 38%,#f97316 45%,#ef4444 45%,#ef4444 100%)"

export function clampFloat(v: number): number {
  if (!Number.isFinite(v)) return FLOAT_MIN
  return Math.min(FLOAT_MAX, Math.max(FLOAT_MIN, Math.round(v * 10000) / 10000))
}

export function parseFloatInput(raw: string, fallback: number): number {
  const v = parseFloat(raw.replace(",", "."))
  return clampFloat(Number.isFinite(v) ? v : fallback)
}

export function floatMarkerLeft(float: number): string {
  return `${Math.min(Math.max(float, 0), 1) * 100}%`
}

export function isFloatFilterActive(floatMin: number, floatMax: number): boolean {
  return floatMin > FLOAT_MIN || floatMax < FLOAT_MAX
}

export function wearBandForFloat(float: number): WearAbbrev {
  for (const band of WEAR_BANDS) {
    if (float >= band.min && (float < band.max || band.key === "BS")) return band.key
  }
  return "BS"
}
