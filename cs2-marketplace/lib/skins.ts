export type Exterior = "FN" | "MW" | "FT" | "WW" | "BS"

export type Rarity = "industrial" | "milspec" | "restricted" | "classified" | "covert" | "contraband"

export const RARITIES: { key: Rarity; color: string }[] = [
  { key: "industrial", color: "#5e98d9" },
  { key: "milspec", color: "#4b69ff" },
  { key: "restricted", color: "#8847ff" },
  { key: "classified", color: "#d32ce6" },
  { key: "covert", color: "#eb4b4b" },
  { key: "contraband", color: "#e4ae39" },
]

export const RARITY_COLOR: Record<Rarity, string> = {
  industrial: "#5e98d9",
  milspec: "#4b69ff",
  restricted: "#8847ff",
  classified: "#d32ce6",
  covert: "#eb4b4b",
  contraband: "#e4ae39",
}

export interface Skin {
  id: number
  owner: "me" | "other"
  type: string
  title: string
  exterior: Exterior
  rarity: Rarity
  float: number
  oldPrice: number    // TRY
  price: number       // TRY
  priceUsd?: number   // USD — Steam reference only
  discount: number
  isST: boolean
  isSV: boolean
  popularity: number
  listedAt: number  // unix ms — for "newest" sort
  img: string
  stickers: { name: string; img: string }[]
  hasFloat?: boolean
  marketHashName?: string
  patternSeed?: number  // 0-999 kalıp şablonu numarası
  phase?: string        // Doppler phase (e.g. "Phase 1", "Ruby", "Sapphire")
  listingId?: string    // real marketplace listing id
  sellerId?: string     // Steam ID of listing owner
}

export const CURRENT_USER = {
  name: "Nigrek",
  avatar: "/users/nigrek.png",
}

export type CategoryKey =
  | "rifle"
  | "smg"
  | "pistol"
  | "heavy"
  | "knife"
  | "glove"
  | "sticker"
  | "music"
  | "agent"

export const CATEGORIES: { key: CategoryKey; icon: string }[] = [
  // Row 1: Tabanca, Hafif Makine (SMG), Tüfek
  { key: "pistol",  icon: "/categories/pistol.png" },
  { key: "smg",    icon: "/categories/smg.png" },
  { key: "rifle",  icon: "/categories/rifle.png" },
  // Row 2: Ağır Silah, Bıçak, Eldiven
  { key: "heavy",  icon: "/categories/heavy.png" },
  { key: "knife",  icon: "/categories/knife.png" },
  { key: "glove",  icon: "/categories/glove.png" },
  // Row 3: Müzik Kiti, Ajan, Çıkartma
  { key: "music",   icon: "/categories/music.png" },
  { key: "agent",  icon: "/categories/agent.png" },
  { key: "sticker", icon: "/categories/sticker.png" },
]

const CATEGORY_BY_WEAPON: Record<string, CategoryKey> = {
  // Rifles
  "AK-47": "rifle", "M4A4": "rifle", "M4A1-S": "rifle", "AWP": "rifle",
  "Galil AR": "rifle", "FAMAS": "rifle", "SG 553": "rifle", "AUG": "rifle",
  "SSG 08": "rifle", "G3SG1": "rifle", "SCAR-20": "rifle",
  // SMGs
  "MP7": "smg", "MP9": "smg", "MP5-SD": "smg", "MAC-10": "smg",
  "UMP-45": "smg", "P90": "smg", "PP-Bizon": "smg",
  // Pistols
  "USP-S": "pistol", "Glock-18": "pistol", "Desert Eagle": "pistol",
  "P2000": "pistol", "P250": "pistol", "Five-SeveN": "pistol",
  "Tec-9": "pistol", "CZ75-Auto": "pistol", "Dual Berettas": "pistol", "R8 Revolver": "pistol",
  // Heavy
  "Negev": "heavy", "M249": "heavy", "Nova": "heavy", "XM1014": "heavy",
  "Sawed-Off": "heavy", "MAG-7": "heavy",
  // Knives — all types
  "Bayonet": "knife", "Bowie Knife": "knife", "Butterfly Knife": "knife",
  "Classic Knife": "knife", "Falchion Knife": "knife", "Flip Knife": "knife",
  "Gut Knife": "knife", "Huntsman Knife": "knife", "Karambit": "knife",
  "Kukri Knife": "knife", "M9 Bayonet": "knife", "Navaja Knife": "knife",
  "Nomad Knife": "knife", "Paracord Knife": "knife", "Shadow Daggers": "knife",
  "Skeleton Knife": "knife", "Stiletto Knife": "knife", "Survival Knife": "knife",
  "Talon Knife": "knife", "Ursus Knife": "knife",
  // Gloves — all types
  "Bloodhound Gloves": "glove", "Broken Fang Gloves": "glove", "Driver Gloves": "glove",
  "Hand Wraps": "glove", "Hydra Gloves": "glove", "Moto Gloves": "glove",
  "Specialist Gloves": "glove", "Sport Gloves": "glove",
  // Stickers
  "Sticker": "sticker",
  // Agents & Music Kits
  "Agent": "agent",
  "Music Kit": "music",
}

const STEAM_TYPE_TO_CATEGORY: Record<string, CategoryKey> = {
  pistol: "pistol",
  rifle: "rifle",
  smg: "smg",
  shotgun: "heavy",
  machinegun: "heavy",
  knife: "knife",
  gloves: "glove",
  sticker: "sticker",
  "music kit": "music",
  agent: "agent",
}

function parseWeaponFromLabel(label: string): string | null {
  const cleaned = label
    .replace(/^StatTrak™\s+/, "")
    .replace(/^Souvenir\s+/, "")
    .replace(/^★\s+/, "")
    .replace(/\s*\([^)]+\)\s*$/, "")
    .trim()
  const weaponPart = cleaned.split(" | ")[0]?.trim()
  if (!weaponPart) return null
  if (CATEGORY_BY_WEAPON[weaponPart]) return weaponPart

  const lower = weaponPart.toLowerCase()
  if (lower.startsWith("sticker")) return "Sticker"
  if (lower.startsWith("music kit")) return "Music Kit"
  if (lower === "agent") return "Agent"

  for (const cat of ["knife", "glove"] as CategoryKey[]) {
    for (const weapon of WEAPONS_BY_CATEGORY[cat]) {
      if (weaponPart === weapon || weaponPart.includes(weapon) || weapon.includes(weaponPart)) {
        return weapon
      }
    }
  }

  return weaponPart
}

/** Normalize Steam inventory/listing type to a weapon or item label used for filters. */
export function resolveItemType(
  type: string,
  name?: string,
  marketHashName?: string,
): string {
  const rawType = (type ?? "").trim()
  if (rawType && CATEGORY_BY_WEAPON[rawType]) return rawType

  for (const source of [name, marketHashName]) {
    if (!source) continue
    const parsed = parseWeaponFromLabel(source)
    if (!parsed) continue
    if (CATEGORY_BY_WEAPON[parsed]) return parsed
    if (parsed === "Sticker" || parsed === "Music Kit" || parsed === "Agent") return parsed
    if (categoryOf(parsed)) return parsed
  }

  return rawType
}

export const WEAPONS_BY_CATEGORY: Record<CategoryKey, string[]> = {
  rifle: ["AK-47", "M4A4", "M4A1-S", "AWP", "Galil AR", "FAMAS", "SG 553", "AUG", "SSG 08", "G3SG1", "SCAR-20"],
  smg: ["MP7", "MP9", "MP5-SD", "MAC-10", "UMP-45", "P90", "PP-Bizon"],
  pistol: ["USP-S", "Glock-18", "Desert Eagle", "P2000", "P250", "Five-SeveN", "Tec-9", "CZ75-Auto", "Dual Berettas", "R8 Revolver"],
  heavy: ["Negev", "M249", "Nova", "XM1014", "Sawed-Off", "MAG-7"],
  knife: [
    "Bayonet", "Bowie Knife", "Butterfly Knife", "Classic Knife", "Falchion Knife",
    "Flip Knife", "Gut Knife", "Huntsman Knife", "Karambit", "Kukri Knife",
    "M9 Bayonet", "Navaja Knife", "Nomad Knife", "Paracord Knife", "Shadow Daggers",
    "Skeleton Knife", "Stiletto Knife", "Survival Knife", "Talon Knife", "Ursus Knife",
  ],
  glove: [
    "Bloodhound Gloves", "Broken Fang Gloves", "Driver Gloves", "Hand Wraps",
    "Hydra Gloves", "Moto Gloves", "Specialist Gloves", "Sport Gloves",
  ],
  sticker: [],
  music: ["Music Kit"],
  agent: ["Agent"],
}

export function categoryOf(type: string): CategoryKey | null {
  if (CATEGORY_BY_WEAPON[type]) return CATEGORY_BY_WEAPON[type]
  const steamCat = STEAM_TYPE_TO_CATEGORY[type.toLowerCase()]
  if (steamCat) return steamCat
  const t = type.toLowerCase()
  if (t.includes("sticker")) return "sticker"
  if (t.includes("knife") || t.includes("karambit") || t.includes("bayonet") || t.includes("daggers"))
    return "knife"
  if (t.includes("glove") || t.includes("hand wraps")) return "glove"
  if (t.includes("music")) return "music"
  if (t.includes("agent")) return "agent"
  return null
}

export function getListedWeaponsInCategory(
  category: CategoryKey,
  items: { type: string; title?: string; marketHashName?: string }[],
): string[] {
  const weapons = new Set<string>()
  for (const item of items) {
    const resolved = resolveItemType(item.type, item.title, item.marketHashName)
    if (categoryOf(resolved) === category) weapons.add(resolved)
  }
  return [...weapons].sort((a, b) => a.localeCompare(b, "tr"))
}

export const EXTERIOR_LABELS: Record<Exterior, string> = {
  FN: "Factory New",
  MW: "Minimal Wear",
  FT: "Field-Tested",
  WW: "Well-Worn",
  BS: "Battle-Scarred",
}


export const skins: Skin[] = [
  {
    id: 1,
    owner: "other",
    type: "AK-47",
    title: "Bloodsport",
    exterior: "FN",
    rarity: "classified",
    float: 0.012,
    oldPrice: 6300,
    price: 5400,
    priceUsd: 120.0,
    discount: 14,
    isST: false,
    isSV: false,
    popularity: 95,
    listedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    img: "/skins/ak47-bloodsport.png",
    stickers: [{ name: "Crown", img: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjMmyMnTGtRln4bLpUbVZqinTKEALBFLHaLYcLrGEkOK_jg2nthLO-OAWR-ZCNM-uR9mRXIpg" }, { name: "Flame", img: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjMmyMnTGtRlz4LLpUbVZqinTKEALBFLHaLYcLrGEkOK_jg2nthLO-OAWR-ZCNM-uR9mRXIpg" }],
  },
  {
    id: 2,
    owner: "other",
    type: "M4A4",
    title: "Neo-Noir",
    exterior: "MW",
    rarity: "covert",
    float: 0.091,
    oldPrice: 2610,
    price: 2025,
    priceUsd: 45.0,
    discount: 22,
    isST: true,
    isSV: false,
    popularity: 88,
    listedAt: Date.now() - 12 * 24 * 60 * 60 * 1000,
    img: "/skins/m4a4-neonoir.png",
    stickers: [{ name: "Skull", img: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjMmyMnTGtRlm4bLpUbVZqinTKEALBFLHaLYcLrGEkOK_jg2nthLO-OAWR-ZCNM-uR9mRXIpg" }],
  },
  {
    id: 3,
    owner: "other",
    type: "AWP",
    title: "Desert Hydra",
    exterior: "FT",
    rarity: "contraband",
    float: 0.21,
    oldPrice: 63000,
    price: 57600,
    priceUsd: 1280.0,
    discount: 8,
    isST: false,
    isSV: true,
    popularity: 99,
    listedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    img: "/skins/awp-deserthydra.png",
    stickers: [{ name: "Crown", img: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjMmyMnTGtRln4bLpUbVZqinTKEALBFLHaLYcLrGEkOK_jg2nthLO-OAWR-ZCNM-uR9mRXIpg" }, { name: "Crown", img: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjMmyMnTGtRln4bLpUbVZqinTKEALBFLHaLYcLrGEkOK_jg2nthLO-OAWR-ZCNM-uR9mRXIpg" }, { name: "Crown", img: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjMmyMnTGtRln4bLpUbVZqinTKEALBFLHaLYcLrGEkOK_jg2nthLO-OAWR-ZCNM-uR9mRXIpg" }],
  },
  {
    id: 4,
    owner: "me",
    type: "M4A1-S",
    title: "Printstream",
    exterior: "FN",
    rarity: "covert",
    float: 0.005,
    oldPrice: 18675,
    price: 13050,
    priceUsd: 290.0,
    discount: 30,
    isST: false,
    isSV: false,
    popularity: 97,
    listedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    img: "/skins/m4a1s-printstream.png",
    stickers: [],
  },
  {
    id: 5,
    owner: "other",
    type: "AWP",
    title: "Asiimov",
    exterior: "FT",
    rarity: "classified",
    float: 0.184,
    oldPrice: 7200,
    price: 5400,
    priceUsd: 120.0,
    discount: 25,
    isST: true,
    isSV: false,
    popularity: 92,
    listedAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
    img: "/skins/awp-asiimov.png",
    stickers: [{ name: "Flame", img: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjMmyMnTGtRlz4LLpUbVZqinTKEALBFLHaLYcLrGEkOK_jg2nthLO-OAWR-ZCNM-uR9mRXIpg" }, { name: "Flame", img: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjMmyMnTGtRlz4LLpUbVZqinTKEALBFLHaLYcLrGEkOK_jg2nthLO-OAWR-ZCNM-uR9mRXIpg" }],
  },
  {
    id: 6,
    owner: "other",
    type: "Glock-18",
    title: "Fade",
    exterior: "FN",
    rarity: "restricted",
    float: 0.041,
    oldPrice: 69750,
    price: 66240,
    priceUsd: 1472.0,
    discount: 5,
    isST: false,
    isSV: false,
    popularity: 91,
    listedAt: Date.now() - 9 * 24 * 60 * 60 * 1000,
    img: "/skins/glock-fade.png",
    stickers: [{ name: "Clover", img: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjMmyMnTGtRlo4LLpUbVZqinTKEALBFLHaLYcLrGEkOK_jg2nthLO-OAWR-ZCNM-uR9mRXIpg" }],
  },
  {
    id: 7,
    owner: "me",
    type: "Desert Eagle",
    title: "Printstream",
    exterior: "FN",
    rarity: "milspec",
    float: 0.025,
    oldPrice: 4410,
    price: 3600,
    priceUsd: 80.0,
    discount: 18,
    isST: false,
    isSV: false,
    popularity: 86,
    listedAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
    img: "/skins/deagle-printstream.png",
    stickers: [],
  },
  {
    id: 8,
    owner: "me",
    type: "USP-S",
    title: "The Traitor",
    exterior: "FN",
    rarity: "industrial",
    float: 0.022,
    oldPrice: 3330,
    price: 2925,
    priceUsd: 65.0,
    discount: 12,
    isST: false,
    isSV: false,
    popularity: 80,
    listedAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
    img: "/skins/usps-traitor.png",
    stickers: [],
  },
  {
    id: 9,
    owner: "other",
    type: "AK-47",
    title: "The Empress",
    exterior: "MW",
    rarity: "restricted",
    float: 0.078,
    oldPrice: 4950,
    price: 3960,
    priceUsd: 88.0,
    discount: 20,
    isST: true,
    isSV: false,
    popularity: 85,
    listedAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
    img: "/skins/ak47-empress.png",
    stickers: [{ name: "Star", img: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjMmyMnTGtRlp4LLpUbVZqinTKEALBFLHaLYcLrGEkOK_jg2nthLO-OAWR-ZCNM-uR9mRXIpg" }, { name: "Star", img: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjMmyMnTGtRlp4LLpUbVZqinTKEALBFLHaLYcLrGEkOK_jg2nthLO-OAWR-ZCNM-uR9mRXIpg" }, { name: "Star", img: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjMmyMnTGtRlp4LLpUbVZqinTKEALBFLHaLYcLrGEkOK_jg2nthLO-OAWR-ZCNM-uR9mRXIpg" }, { name: "Star", img: "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjMmyMnTGtRlp4LLpUbVZqinTKEALBFLHaLYcLrGEkOK_jg2nthLO-OAWR-ZCNM-uR9mRXIpg" }],
  },
]

export type SaleAction = "bought" | "listed" | "traded" | "escrowed"

export const liveSalesPool: { item: string; action: SaleAction; price: string }[] = [
  { item: "★ Butterfly Knife | Fade", action: "bought", price: "₺109.622" },
  { item: "M4A1-S | Imminent Danger", action: "listed", price: "₺23.851" },
  { item: "StatTrak™ AK-47 | Vulcan", action: "traded", price: "₺32.424" },
  { item: "Sticker | iBUYPOWER | Katowice 2014", action: "bought", price: "₺477.400" },
  { item: "Souvenir AWP | Desert Hydra", action: "escrowed", price: "₺45.815" },
  { item: "Glock-18 | Fade", action: "bought", price: "₺56.689" },
  { item: "★ Karambit | Doppler", action: "listed", price: "₺43.071" },
  { item: "USP-S | Kill Confirmed", action: "traded", price: "₺3.606" },
]

// Live USD → TRY rate — used at LOAD TIME to convert API prices to TRY
// After conversion, prices are stored as TRY. Rate also used for Steam reference.
let _usdToTry = 45.96

export function setUsdToTry(rate: number) {
  if (rate > 1) _usdToTry = rate
}

export function getUsdToTry(): number {
  return _usdToTry
}

/** Format a TRY value for display */
export function formatPrice(tryValue: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(Math.round(tryValue))
}

/** Raw USD price for Steam reference display */
export function formatUSD(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value)
}

export function steamMarketUrl(type: string, title: string, exterior: Exterior, hasFloat?: boolean, marketHashName?: string): string {
  if (marketHashName) {
    return `https://steamcommunity.com/market/listings/730/${encodeURIComponent(marketHashName)}`
  }
  if (hasFloat === false) {
    const itemName = type === "Agent" || type === "Music Kit" ? title : `${type} | ${title}`
    return `https://steamcommunity.com/market/listings/730/${encodeURIComponent(itemName)}`
  }
  const exteriorFull = EXTERIOR_LABELS[exterior]
  const itemName = `${type} | ${title} (${exteriorFull})`
  return `https://steamcommunity.com/market/listings/730/${encodeURIComponent(itemName)}`
}

export function steamInventoryUrl(steamId: string): string {
  return `https://steamcommunity.com/profiles/${steamId}/inventory/#730`
}

export function steamProfileUrl(steamId: string): string {
  return `https://steamcommunity.com/profiles/${steamId}`
}
