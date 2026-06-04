import type { Skin, Rarity, Exterior } from "./skins"
import { getUsdToTry } from "./skins"

const BASE = "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en"

// skins_not_grouped gives one entry per (skin × wear) with the correct per-wear image
const SKINS_URL        = `${BASE}/skins_not_grouped.json`
const AGENTS_URL       = `${BASE}/agents.json`
const MUSIC_KITS_URL   = `${BASE}/music_kits.json`
const STICKERS_URL     = `${BASE}/stickers.json`

const CACHE_KEY = "skx_cs2_v17"
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 h

// ─── API shapes ──────────────────────────────────────────────────────────────

interface CS2SkinRaw {
  id: string             // unique per wear entry, e.g. "skin-xxx-fn"
  skin_id: string        // shared across all wears of same pattern
  name: string           // "AK-47 | Bloodsport (Field-Tested)"
  weapon: { id: string; weapon_id: number; name: string } | null
  category: { id: string; name: string } | null
  min_float: number | null
  max_float: number | null
  wear: { id: string; name: string } | null
  rarity: { id: string; name: string; color: string }
  stattrak: boolean
  souvenir: boolean
  market_hash_name: string
  pattern: { id: string; name: string } | null
  image: string
}

interface CS2AgentRaw {
  id: string
  name: string
  market_hash_name?: string
  rarity: { id: string; name: string; color: string }
  image: string
}

interface CS2MusicKitRaw {
  id: string
  name: string
  market_hash_name?: string
  rarity: { id: string; name: string; color: string }
  image: string
}

interface CS2StickerRaw {
  id: string
  name: string
  market_hash_name?: string
  rarity: { id: string; name: string; color: string }
  image: string
}

// ─── Market volume map (market_hash_name → quantity from Skinport) ───────────────
// Populated after fetching /api/market-volume; used for realistic popularity scores
let volumeMap: Record<string, number> = {}

export function setVolumeMap(map: Record<string, number>) {
  volumeMap = map
}

let priceMap: Record<string, number> = {}

export function setPriceMap(map: Record<string, number>) {
  priceMap = map
}

// ─── Sticker pool ─────────────────────────────────────────────────────────────
let stickerPool: { name: string; img: string }[] = []

// ─── Deterministic RNG ────────────────────────────────────────────────────────

function fnv1a(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function xr(seed: number): number {
  let s = (seed >>> 0) || 1
  s ^= s << 13; s ^= s >> 17; s ^= s << 5
  return (s >>> 0) / 0xffffffff
}

function rnd(base: number, off: number, lo: number, hi: number): number {
  return lo + xr(base + off * 1_000_003) * (hi - lo)
}

// ─── Popularity from market volume ───────────────────────────────────────────

/** Max quantity seen in the volume map (used for normalization) */
let _maxVolume = 0

function computePopularity(marketHashName: string, seed: number): number {
  const qty = volumeMap[marketHashName] ?? 0
  if (qty > 0) {
    if (qty > _maxVolume) _maxVolume = qty
    // Normalize to 1-100 on a log scale so huge outliers don't dominate
    const score = Math.round(1 + 99 * (Math.log(qty + 1) / Math.log((_maxVolume || qty) + 1)))
    return Math.max(1, Math.min(100, score))
  }
  // Fall back to seeded value (20-80) so unknown items spread out
  return Math.round(rnd(seed, 4, 20, 80))
}

const NOW = Date.now()
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

/** Pseudo random listing time within last 30 days (stable per item via seed) */
function computeListedAt(seed: number): number {
  return Math.round(NOW - xr(seed + 55_555) * THIRTY_DAYS_MS)
}

// ─── Smart price resolver ────────────────────────────────────────────────────

const WEAR_SUFFIXES = [
  " (Factory New)", " (Minimal Wear)", " (Field-Tested)", " (Well-Worn)", " (Battle-Scarred)"
]

/**
 * Tries to resolve a real market price:
 * 1. Exact market_hash_name match
 * 2. For knives/gloves: any wear of the same skin
 * 3. Returns undefined → caller falls back to seeded RNG
 */
function resolvePrice(
  mhn: string | undefined,
  isSpecial: boolean,
  rarity: Rarity,
  seed: number,
): number | undefined {
  if (!mhn) return undefined

  // 1. Exact match
  const exact = priceMap[mhn]
  if (exact) return exact

  // 2. For knives/gloves: try all wear variants of the same base skin
  if (isSpecial) {
    // Strip wear suffix to get base name
    let baseName = mhn
    for (const suffix of WEAR_SUFFIXES) {
      if (mhn.endsWith(suffix)) { baseName = mhn.slice(0, -suffix.length); break }
    }
    const found: number[] = []
    for (const suffix of WEAR_SUFFIXES) {
      const p = priceMap[baseName + suffix]
      if (p) found.push(p)
    }
    if (found.length > 0) {
      // Use median of found prices as reference, adjusted by wear position
      found.sort((a, b) => a - b)
      return found[Math.floor(found.length / 2)]
    }
    // 3. Fallback: realistic knife/glove ranges based on rarity
    // Most non-Doppler knives: $80-$400; rare patterns higher
    const knifeBase: Record<Rarity, [number, number]> = {
      industrial: [50, 120],
      milspec:    [60, 180],
      restricted: [70, 300],
      classified: [100, 600],
      covert:     [150, 1200],
      contraband: [200, 2500],
    }
    const [lo, hi] = knifeBase[rarity]
    return Math.round(rnd(seed, 1, lo, hi) * 100) / 100
  }

  return undefined
}

// ─── Sticker assignment ───────────────────────────────────────────────────────

function buildStickers(seed: number): { name: string; img: string }[] {
  if (stickerPool.length === 0) return []
  if (xr(seed + 77_777) > 0.35) return []
  const count = Math.floor(xr(seed + 88_888) * 4) + 1
  return Array.from({ length: count }, (_, i) => {
    const idx = Math.floor(xr(seed + 99_999 + i * 1_111) * stickerPool.length)
    return stickerPool[idx]
  })
}

// ─── Wear / exterior mapping ──────────────────────────────────────────────────

const WEAR_ID_TO_EXT: Record<string, Exterior> = {
  SFUI_InvTooltip_Wear_Amount_0: "FN",
  SFUI_InvTooltip_Wear_Amount_1: "MW",
  SFUI_InvTooltip_Wear_Amount_2: "FT",
  SFUI_InvTooltip_Wear_Amount_3: "WW",
  SFUI_InvTooltip_Wear_Amount_4: "BS",
}

const EXT_FLOAT: Record<Exterior, [number, number]> = {
  FN: [0, 0.07], MW: [0.07, 0.15], FT: [0.15, 0.38], WW: [0.38, 0.45], BS: [0.45, 1],
}

function floatForExterior(ext: Exterior, minF: number, maxF: number, seed: number): number {
  const [eMin, eMax] = EXT_FLOAT[ext]
  const lo = Math.max(minF, eMin), hi = Math.min(maxF, eMax)
  if (lo >= hi) return Math.round(((lo + hi) / 2) * 10_000) / 10_000
  return Math.round(rnd(seed, 3, lo, hi) * 10_000) / 10_000
}

// ─── Rarity mapping ───────────────────────────────────────────────────────────

function mapWeaponRarity(name: string): Rarity {
  const n = name.toLowerCase()
  if (n === "contraband") return "contraband"
  if (n.includes("covert") || n.includes("extraordinary")) return "covert"
  if (n.includes("classified")) return "classified"
  if (n.includes("restricted")) return "restricted"
  if (n.includes("mil-spec")) return "milspec"
  return "industrial"
}

function mapAgentRarity(name: string): Rarity {
  const n = name.toLowerCase()
  if (n.includes("master")) return "covert"
  if (n.includes("superior")) return "classified"
  if (n.includes("exceptional")) return "restricted"
  return "milspec"
}

function mapStickerRarity(name: string): Rarity {
  const n = name.toLowerCase()
  if (n === "contraband") return "contraband"
  if (n.includes("extraordinary")) return "covert"
  if (n.includes("exotic")) return "classified"
  if (n.includes("remarkable")) return "restricted"
  if (n.includes("high grade")) return "milspec"
  return "industrial"
}

// ─── Price tables ─────────────────────────────────────────────────────────────

const WEAPON_PRICE: Record<Rarity, [number, number]> = {
  industrial: [0.05, 3],
  milspec:    [0.5, 30],
  restricted: [2, 80],
  classified: [15, 300],
  covert:     [60, 1500],
  contraband: [2000, 4500],
}

const KNIFE_GLOVE_PRICE: [number, number] = [50, 2500]

const AGENT_PRICE: Record<Rarity, [number, number]> = {
  industrial: [5, 20],
  milspec:    [10, 50],
  restricted: [20, 120],
  classified: [40, 250],
  covert:     [70, 500],
  contraband: [100, 600],
}

const STICKER_PRICE: Record<Rarity, [number, number]> = {
  industrial: [0.03, 0.5],
  milspec:    [0.05, 3],
  restricted: [0.5, 15],
  classified: [2, 80],
  covert:     [10, 500],
  contraband: [1000, 15000],
}

const MUSIC_PRICE: [number, number] = [2, 25]

// ─── Transforms ───────────────────────────────────────────────────────────────

export function transformSkin(raw: CS2SkinRaw, index: number): Skin | null {
  if (!raw.image || !raw.name || !raw.weapon || !raw.wear) return null

  // Name format: "AK-47 | Bloodsport (Field-Tested)"
  // Strip the wear suffix to get the title
  const nameNoWear = raw.name.replace(/\s*\([^)]+\)\s*$/, "").trim()
  const parts = nameNoWear.split(" | ")
  if (parts.length < 2) return null

  const typeName = raw.weapon.name.replace(/^★\s*/, "").trim()
  const title = parts.slice(1).join(" | ").trim()
  if (!title) return null

  const exterior: Exterior = WEAR_ID_TO_EXT[raw.wear.id] ?? "FT"
  const seed = fnv1a(raw.id)
  const rarity = mapWeaponRarity(raw.rarity.name)

  const isSpecial =
    raw.category?.name === "Knives" ||
    raw.category?.name === "Gloves" ||
    typeName.endsWith("Knife") || typeName === "Karambit" ||
    typeName === "Bayonet" || typeName.includes("Dagger") ||
    typeName.endsWith("Gloves") || typeName === "Hand Wraps"

  // Use real market price when available
  const realPrice = resolvePrice(raw.market_hash_name, isSpecial, rarity, seed)
  const [prMin, prMax] = isSpecial ? KNIFE_GLOVE_PRICE : WEAPON_PRICE[rarity]
  const refPriceUsd = realPrice ?? Math.round(rnd(seed, 1, prMin, prMax) * 100) / 100
  const rate = getUsdToTry()
  const refPriceTry = Math.round(refPriceUsd * rate) // Steam reference in TRY

  // ~30% of listings are priced above market (premium), 70% below (discount)
  const isPremium = xr(seed + 33_333) < 0.30
  const variationPct = isPremium
    ? Math.round(rnd(seed, 7, 3, 35))   // +3% to +35% above market
    : Math.round(rnd(seed, 8, 3, 40))   // -3% to -40% below market
  const marketDiff = isPremium ? variationPct : -variationPct

  // listing price based on market variation
  const price = Math.round(refPriceTry * (1 + marketDiff / 100))
  const priceUsd = refPriceUsd
  const oldPrice = isPremium ? refPriceTry : Math.round(price * (1 + Math.abs(marketDiff) / 100))
  const discount = marketDiff  // negative = premium, positive = discount

  const minF = raw.min_float ?? 0, maxF = raw.max_float ?? 1

  return {
    id: 1000 + index,
    owner: xr(seed + 9_999) < 0.08 ? "me" : "other",
    type: typeName,
    title,
    exterior,
    rarity,
    float: floatForExterior(exterior, minF, maxF, seed),
    oldPrice,
    price,
    discount,
    isST: raw.stattrak ? xr(seed + 5) > 0.65 : false,
    isSV: raw.souvenir ? xr(seed + 6) > 0.75 : false,
    popularity: computePopularity(raw.market_hash_name, seed),
    listedAt: computeListedAt(seed),
    img: raw.image,       // ← per-wear image from skins_not_grouped
    // Stickers only apply to weapons — not knives or gloves
    stickers: isSpecial ? [] : buildStickers(seed),
    hasFloat: true,
    marketHashName: raw.market_hash_name || undefined,
    pattern: raw.pattern?.name || undefined,
  }
}

export function transformAgent(raw: CS2AgentRaw, index: number): Skin | null {
  if (!raw.image || !raw.name) return null
  const seed = fnv1a(raw.id)
  const rarity = mapAgentRarity(raw.rarity.name)
  const mhn = raw.market_hash_name || raw.name
  const realPrice = priceMap[mhn]
  const [prMin, prMax] = AGENT_PRICE[rarity]
  const priceUsd = realPrice ?? Math.round(rnd(seed, 1, prMin, prMax) * 100) / 100
  const price = Math.round(priceUsd * getUsdToTry())
  const discount = Math.round(rnd(seed, 2, 5, 30))
  return {
    id: 4000 + index,
    owner: xr(seed + 9_999) < 0.06 ? "me" : "other",
    type: "Agent",
    title: raw.name,
    exterior: "FN",
    rarity,
    float: 0,
    priceUsd,
    oldPrice: Math.round(price * (1 + discount / 100)),
    price,
    discount,
    isST: false, isSV: false,
    popularity: computePopularity(mhn, seed),
    listedAt: computeListedAt(seed),
    img: raw.image,
    stickers: [],
    hasFloat: false,
    marketHashName: mhn,
  }
}

export function transformMusicKit(raw: CS2MusicKitRaw, index: number): Skin | null {
  if (!raw.image || !raw.name) return null
  const seed = fnv1a(raw.id)
  const mhn = raw.market_hash_name || `Music Kit | ${raw.name}`
  const realPrice = priceMap[mhn] || priceMap[`StatTrak™ Music Kit | ${raw.name}`]
  const priceUsd = realPrice ?? Math.round(rnd(seed, 1, MUSIC_PRICE[0], MUSIC_PRICE[1]) * 100) / 100
  const price = Math.round(priceUsd * getUsdToTry())
  const discount = Math.round(rnd(seed, 2, 3, 25))
  return {
    id: 5000 + index,
    owner: xr(seed + 9_999) < 0.05 ? "me" : "other",
    type: "Music Kit",
    title: raw.name,
    exterior: "FN",
    rarity: "milspec",
    float: 0,
    priceUsd,
    oldPrice: Math.round(price * (1 + discount / 100)),
    price,
    discount,
    isST: false, isSV: false,
    popularity: computePopularity(mhn, seed),
    listedAt: computeListedAt(seed),
    img: raw.image,
    stickers: [],
    hasFloat: false,
    marketHashName: mhn,
  }
}

export function transformSticker(raw: CS2StickerRaw, index: number): Skin | null {
  if (!raw.image || !raw.name) return null
  const parts = raw.name.split(" | ")
  const title = parts.length >= 2 ? parts.slice(1).join(" | ").trim() : raw.name.trim()
  if (!title) return null
  const seed = fnv1a(raw.id)
  const rarity = mapStickerRarity(raw.rarity.name)
  const mhn = raw.market_hash_name || raw.name
  const realPrice = priceMap[mhn]
  const [prMin, prMax] = STICKER_PRICE[rarity]
  const priceUsd = realPrice ?? Math.round(rnd(seed, 1, prMin, prMax) * 100) / 100
  const price = Math.round(priceUsd * getUsdToTry())
  const discount = Math.round(rnd(seed, 2, 3, 30))
  return {
    id: 6000 + index,
    owner: xr(seed + 9_999) < 0.04 ? "me" : "other",
    type: "Sticker",
    title,
    exterior: "FN",
    rarity,
    float: 0,
    priceUsd,
    oldPrice: Math.round(price * (1 + discount / 100)),
    price,
    discount,
    isST: false, isSV: false,
    popularity: computePopularity(mhn, seed),
    listedAt: computeListedAt(seed),
    img: raw.image,
    stickers: [],
    hasFloat: false,
    marketHashName: mhn,
  }
}

// ─── Public loader ─────────────────────────────────────────────────────────────

interface CachedPayload { ts: number; items: Skin[] }

export async function loadCS2Items(): Promise<Skin[]> {
  // Try cache
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) {
      const cached: CachedPayload = JSON.parse(raw)
      if (Date.now() - cached.ts < CACHE_TTL && cached.items.length > 0)
        return cached.items
    }
  } catch {}

  // Fetch all sources in parallel
  const [skinsRaw, agents, musicKits, stickersRaw] = await Promise.all([
    fetch(SKINS_URL).then(r => r.json()) as Promise<CS2SkinRaw[]>,
    fetch(AGENTS_URL).then(r => r.json()) as Promise<CS2AgentRaw[]>,
    fetch(MUSIC_KITS_URL).then(r => r.json()) as Promise<CS2MusicKitRaw[]>,
    fetch(STICKERS_URL).then(r => r.json()) as Promise<CS2StickerRaw[]>,
  ])

  // Build sticker pool first so buildStickers() works during skin transforms
  stickerPool = stickersRaw
    .filter(r => r.rarity?.name !== "Default" && r.image)
    .map(r => ({
      name: r.name.replace(/^Sticker \| /, "").trim(),
      img: r.image,
    }))

  const items: Skin[] = []

  skinsRaw.forEach((raw, i) => {
    const s = transformSkin(raw, i)
    if (s) items.push(s)
  })

  agents.forEach((raw, i) => {
    const a = transformAgent(raw, i)
    if (a) items.push(a)
  })

  musicKits.forEach((raw, i) => {
    const m = transformMusicKit(raw, i)
    if (m) items.push(m)
  })

  stickersRaw.forEach((raw, i) => {
    if (raw.rarity?.name === "Default") return
    const s = transformSticker(raw, i)
    if (s) items.push(s)
  })

  // Cache result
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), items }))
  } catch {}

  return items
}
