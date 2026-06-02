import type { Skin, Rarity, Exterior } from "./skins"

const BASE = "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en"

const CACHE_KEY = "skx_cs2_v5"         // bump to bust old caches
const CACHE_TTL = 24 * 60 * 60 * 1000  // 24 h

// ─── API shapes ──────────────────────────────────────────────────────────────

interface CS2Wear { id: string; name: string }

interface CS2SkinRaw {
  id: string
  name: string
  weapon: { id: string; weapon_id: number; name: string } | null
  category: { id: string; name: string } | null
  min_float: number | null
  max_float: number | null
  rarity: { id: string; name: string; color: string }
  stattrak: boolean
  souvenir: boolean
  wears: CS2Wear[]
  image: string
}

interface CS2AgentRaw {
  id: string
  name: string
  rarity: { id: string; name: string; color: string }
  image: string
}

interface CS2MusicKitRaw {
  id: string
  name: string
  rarity: { id: string; name: string; color: string }
  exclusive?: boolean
  image: string
}

// ─── Deterministic RNG ──────────────────────────────────────────────────────

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

// ─── Rarity mapping ──────────────────────────────────────────────────────────
//
// Skin rarities (name from API):
//   Consumer Grade  → industrial
//   Industrial Grade → industrial
//   Mil-Spec Grade  → milspec
//   Restricted      → restricted
//   Classified      → classified
//   Covert          → covert
//   Extraordinary   → covert   ← knives & gloves (★)
//   Contraband      → contraband  ← ONLY M4A4 Howl
//
// Agent rarities:
//   Distinguished   → milspec
//   Exceptional     → restricted
//   Superior        → classified
//   Master          → covert
//
// Music kit rarities:
//   High Grade      → milspec  (all music kits are this)

function mapWeaponRarity(name: string): Rarity {
  const n = name.toLowerCase()
  if (n === "contraband") return "contraband"          // only M4A4 Howl
  if (n.includes("covert")) return "covert"
  if (n.includes("extraordinary")) return "covert"     // knives & gloves
  if (n.includes("classified")) return "classified"
  if (n.includes("restricted")) return "restricted"
  if (n.includes("mil-spec")) return "milspec"
  return "industrial" // consumer grade + industrial grade
}

function mapAgentRarity(name: string): Rarity {
  const n = name.toLowerCase()
  if (n.includes("master")) return "covert"
  if (n.includes("superior")) return "classified"
  if (n.includes("exceptional")) return "restricted"
  return "milspec" // distinguished
}

// ─── Float / exterior helpers ────────────────────────────────────────────────

const WEAR_ID_MAP: Record<string, Exterior> = {
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

const MUSIC_PRICE: [number, number] = [2, 25]

// ─── Transforms ──────────────────────────────────────────────────────────────

export function transformSkin(raw: CS2SkinRaw, index: number): Skin | null {
  if (!raw.image || !raw.name || !raw.weapon) return null
  if (!raw.wears || raw.wears.length === 0) return null

  const parts = raw.name.split(" | ")
  if (parts.length < 2) return null

  const typeName = raw.weapon.name.replace(/^★\s*/, "").trim()
  const title = parts.slice(1).join(" | ").trim()
  if (!title) return null

  const seed = fnv1a(raw.id)
  const rarity = mapWeaponRarity(raw.rarity.name)

  const isSpecial =
    raw.category?.name === "Knives" ||
    raw.category?.name === "Gloves" ||
    typeName.endsWith("Knife") || typeName.endsWith("Knives") ||
    typeName === "Karambit" || typeName === "Bayonet" ||
    typeName.includes("Dagger") ||
    typeName.endsWith("Gloves") || typeName === "Hand Wraps"

  const wearIdx = Math.floor(xr(seed) * raw.wears.length)
  const exterior: Exterior = WEAR_ID_MAP[raw.wears[wearIdx].id] ?? "FT"

  const minF = raw.min_float ?? 0, maxF = raw.max_float ?? 1
  const float = floatForExterior(exterior, minF, maxF, seed)

  const [prMin, prMax] = isSpecial ? KNIFE_GLOVE_PRICE : WEAPON_PRICE[rarity]
  const price = Math.round(rnd(seed, 1, prMin, prMax) * 100) / 100
  const discount = Math.round(rnd(seed, 2, 3, 40))
  const oldPrice = Math.round(price * (1 + discount / 100) * 100) / 100

  return {
    id: 1000 + index,
    owner: xr(seed + 9_999) < 0.08 ? "me" : "other",
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
    popularity: Math.round(rnd(seed, 4, 20, 100)),
    img: raw.image,
    stickers: [],
    hasFloat: true,
  }
}

export function transformAgent(raw: CS2AgentRaw, index: number): Skin | null {
  if (!raw.image || !raw.name) return null

  const seed = fnv1a(raw.id)
  const rarity = mapAgentRarity(raw.rarity.name)
  const [prMin, prMax] = AGENT_PRICE[rarity]
  const price = Math.round(rnd(seed, 1, prMin, prMax) * 100) / 100
  const discount = Math.round(rnd(seed, 2, 5, 30))
  const oldPrice = Math.round(price * (1 + discount / 100) * 100) / 100

  return {
    id: 4000 + index,
    owner: xr(seed + 9_999) < 0.06 ? "me" : "other",
    type: "Agent",
    title: raw.name,
    exterior: "FN",
    rarity,
    float: 0,
    oldPrice,
    price,
    discount,
    isST: false,
    isSV: false,
    popularity: Math.round(rnd(seed, 4, 20, 90)),
    img: raw.image,
    stickers: [],
    hasFloat: false,
  }
}

export function transformMusicKit(raw: CS2MusicKitRaw, index: number): Skin | null {
  if (!raw.image || !raw.name) return null

  const seed = fnv1a(raw.id)
  const price = Math.round(rnd(seed, 1, MUSIC_PRICE[0], MUSIC_PRICE[1]) * 100) / 100
  const discount = Math.round(rnd(seed, 2, 3, 25))
  const oldPrice = Math.round(price * (1 + discount / 100) * 100) / 100

  return {
    id: 5000 + index,
    owner: xr(seed + 9_999) < 0.05 ? "me" : "other",
    type: "Music Kit",
    title: raw.name,
    exterior: "FN",
    rarity: "milspec",
    float: 0,
    oldPrice,
    price,
    discount,
    isST: false,
    isSV: false,
    popularity: Math.round(rnd(seed, 4, 20, 80)),
    img: raw.image,
    stickers: [],
    hasFloat: false,
  }
}

// ─── Public loader ────────────────────────────────────────────────────────────

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
  const [skins, agents, musicKits] = await Promise.all([
    fetch(`${BASE}/skins.json`).then(r => r.json()) as Promise<CS2SkinRaw[]>,
    fetch(`${BASE}/agents.json`).then(r => r.json()) as Promise<CS2AgentRaw[]>,
    fetch(`${BASE}/music_kits.json`).then(r => r.json()) as Promise<CS2MusicKitRaw[]>,
  ])

  const items: Skin[] = []

  skins.forEach((raw, i) => {
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

  // Cache
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), items }))
  } catch {}

  return items
}
