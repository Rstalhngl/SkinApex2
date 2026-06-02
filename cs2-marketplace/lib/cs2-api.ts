import type { Skin, Rarity, Exterior } from "./skins"

const API_URL =
  "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json"

// Cache key — bump version when data shape changes
const CACHE_KEY = "skx_cs2_v3"
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 h

// ─── API shape ──────────────────────────────────────────────────────────────

interface CS2APISkin {
  id: string
  name: string
  weapon: { id: string; weapon_id: number; name: string } | null
  category: { id: string; name: string } | null
  pattern: { id: string; name: string } | null
  min_float: number | null
  max_float: number | null
  rarity: { id: string; name: string; color: string }
  stattrak: boolean
  souvenir: boolean
  wears: { id: string; name: string }[]
  image: string
}

// ─── Deterministic RNG ──────────────────────────────────────────────────────

/** FNV-1a 32-bit hash → stable seed from string id */
function fnv1a(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** xorshift32 — yields [0,1) from a 32-bit seed */
function xr(seed: number): number {
  let s = (seed >>> 0) || 1
  s ^= s << 13
  s ^= s >> 17
  s ^= s << 5
  return (s >>> 0) / 0xffffffff
}

/** random float in [min, max) using derived seed */
function rnd(baseSeed: number, offset: number, min: number, max: number): number {
  return min + xr(baseSeed + offset * 1_000_003) * (max - min)
}

// ─── Rarity mapping ─────────────────────────────────────────────────────────

function mapRarity(rarityName: string): Rarity {
  const n = rarityName.toLowerCase()
  if (n.includes("covert")) return "covert"
  if (n.includes("classified")) return "classified"
  if (n.includes("restricted")) return "restricted"
  if (n.includes("mil-spec")) return "milspec"
  if (n.includes("industrial")) return "industrial"
  if (n.includes("contraband") || n.includes("extraordinary")) return "contraband"
  return "industrial" // Consumer Grade → treat as industrial
}

const PRICE_RANGES: Record<Rarity, [number, number]> = {
  industrial: [0.05, 3],
  milspec: [0.5, 30],
  restricted: [2, 80],
  classified: [15, 300],
  covert: [60, 1500],
  contraband: [100, 4000],
}

// ─── Exterior / float helpers ────────────────────────────────────────────────

const WEAR_ID_MAP: Record<string, Exterior> = {
  SFUI_InvTooltip_Wear_Amount_0: "FN",
  SFUI_InvTooltip_Wear_Amount_1: "MW",
  SFUI_InvTooltip_Wear_Amount_2: "FT",
  SFUI_InvTooltip_Wear_Amount_3: "WW",
  SFUI_InvTooltip_Wear_Amount_4: "BS",
}

const EXT_FLOAT: Record<Exterior, [number, number]> = {
  FN: [0, 0.07],
  MW: [0.07, 0.15],
  FT: [0.15, 0.38],
  WW: [0.38, 0.45],
  BS: [0.45, 1],
}

function floatForExterior(ext: Exterior, minF: number, maxF: number, seed: number): number {
  const [eMin, eMax] = EXT_FLOAT[ext]
  const lo = Math.max(minF, eMin)
  const hi = Math.min(maxF, eMax)
  if (lo >= hi) return Math.round(((lo + hi) / 2) * 10_000) / 10_000
  return Math.round(rnd(seed, 3, lo, hi) * 10_000) / 10_000
}

// ─── Transform ───────────────────────────────────────────────────────────────

export function transformCS2Skin(raw: CS2APISkin, index: number): Skin | null {
  if (!raw.image || !raw.name || !raw.weapon) return null

  const nameParts = raw.name.split(" | ")
  if (nameParts.length < 2) return null

  // Knife/glove names have "★ " prefix — strip for our type field
  const typeName = raw.weapon.name.replace(/^★\s*/, "").trim()
  const title = nameParts.slice(1).join(" | ").trim()
  if (!title) return null

  // Skip items with no valid wear conditions
  if (!raw.wears || raw.wears.length === 0) return null

  const seed = fnv1a(raw.id)

  // Pick one wear condition deterministically
  const wearIdx = Math.floor(xr(seed) * raw.wears.length)
  const wear = raw.wears[wearIdx]
  const exterior: Exterior = WEAR_ID_MAP[wear.id] ?? "FT"

  const minF = raw.min_float ?? 0
  const maxF = raw.max_float ?? 1
  const float = floatForExterior(exterior, minF, maxF, seed)

  const rarity = mapRarity(raw.rarity.name)

  const isSpecial =
    raw.category?.name === "Knives" ||
    raw.category?.name === "Gloves" ||
    typeName.includes("Knife") ||
    typeName.includes("Karambit") ||
    typeName.includes("Bayonet") ||
    typeName.includes("Dagger") ||
    typeName.includes("Gloves") ||
    typeName.includes("Hand Wraps")

  const [prMin, prMax] = isSpecial ? ([50, 2500] as [number, number]) : PRICE_RANGES[rarity]
  const price = Math.round(rnd(seed, 1, prMin, prMax) * 100) / 100
  const discount = Math.round(rnd(seed, 2, 3, 40))
  const oldPrice = Math.round(price * (1 + discount / 100) * 100) / 100
  const popularity = Math.round(rnd(seed, 4, 20, 100))

  // ~8% of items are "owned" by the current user (to demo sell feature)
  const isOwned = xr(seed + 9_999) < 0.08

  return {
    id: 1000 + index,
    owner: isOwned ? "me" : "other",
    type: typeName,
    title,
    exterior,
    rarity,
    float,
    oldPrice,
    price,
    discount,
    isST: raw.stattrak ? xr(seed + 5) > 0.65 : false,
    isSV: raw.souvenir ? xr(seed + 6) > 0.75 : false,
    popularity,
    img: raw.image,
    stickers: [],
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

interface CachedPayload {
  ts: number
  items: Skin[]
}

export async function loadCS2Items(): Promise<Skin[]> {
  // 1. Try localStorage cache
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) {
      const cached: CachedPayload = JSON.parse(raw)
      if (Date.now() - cached.ts < CACHE_TTL && cached.items.length > 0) {
        return cached.items
      }
    }
  } catch {
    // ignore parse/storage errors
  }

  // 2. Fetch from GitHub
  const res = await fetch(API_URL)
  if (!res.ok) throw new Error(`CS2 API ${res.status}`)

  const data: CS2APISkin[] = await res.json()

  const items: Skin[] = []
  data.forEach((raw, i) => {
    const skin = transformCS2Skin(raw, i)
    if (skin) items.push(skin)
  })

  // 3. Persist
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), items }))
  } catch {
    // storage full — continue without cache
  }

  return items
}
