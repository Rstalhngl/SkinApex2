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
  oldPrice: number
  price: number
  discount: number
  isST: boolean
  isSV: boolean
  popularity: number
  img: string
  stickers: string[]
  hasFloat?: boolean
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
  { key: "rifle", icon: "/categories/rifle.png" },
  { key: "smg", icon: "/categories/smg.png" },
  { key: "pistol", icon: "/categories/pistol.png" },
  { key: "heavy", icon: "/categories/heavy.png" },
  { key: "knife", icon: "/categories/knife.png" },
  { key: "glove", icon: "/categories/glove.png" },
  { key: "sticker", icon: "/categories/sticker.png" },
  { key: "music", icon: "/categories/music.png" },
  { key: "agent", icon: "/categories/agent.png" },
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
  const t = type.toLowerCase()
  if (t.includes("knife") || t.includes("karambit") || t.includes("bayonet") || t.includes("daggers"))
    return "knife"
  if (t.includes("glove") || t.includes("hand wraps")) return "glove"
  if (t.includes("music")) return "music"
  if (t.includes("agent")) return "agent"
  return null
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
    oldPrice: 140.0,
    price: 120.0,
    discount: 14,
    isST: false,
    isSV: false,
    popularity: 95,
    img: "/skins/ak47-bloodsport.png",
    stickers: ["Crown", "Flame"],
  },
  {
    id: 2,
    owner: "other",
    type: "M4A4",
    title: "Neo-Noir",
    exterior: "MW",
    rarity: "covert",
    float: 0.091,
    oldPrice: 58.0,
    price: 45.0,
    discount: 22,
    isST: true,
    isSV: false,
    popularity: 88,
    img: "/skins/m4a4-neonoir.png",
    stickers: ["Skull"],
  },
  {
    id: 3,
    owner: "other",
    type: "AWP",
    title: "Desert Hydra",
    exterior: "FT",
    rarity: "contraband",
    float: 0.21,
    oldPrice: 1400.0,
    price: 1280.0,
    discount: 8,
    isST: false,
    isSV: true,
    popularity: 99,
    img: "/skins/awp-deserthydra.png",
    stickers: ["Crown", "Crown", "Crown"],
  },
  {
    id: 4,
    owner: "me",
    type: "M4A1-S",
    title: "Printstream",
    exterior: "FN",
    rarity: "covert",
    float: 0.005,
    oldPrice: 415.0,
    price: 290.0,
    discount: 30,
    isST: false,
    isSV: false,
    popularity: 97,
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
    oldPrice: 160.0,
    price: 120.0,
    discount: 25,
    isST: true,
    isSV: false,
    popularity: 92,
    img: "/skins/awp-asiimov.png",
    stickers: ["Flame", "Flame"],
  },
  {
    id: 6,
    owner: "other",
    type: "Glock-18",
    title: "Fade",
    exterior: "FN",
    rarity: "restricted",
    float: 0.041,
    oldPrice: 1550.0,
    price: 1472.0,
    discount: 5,
    isST: false,
    isSV: false,
    popularity: 91,
    img: "/skins/glock-fade.png",
    stickers: ["Clover"],
  },
  {
    id: 7,
    owner: "me",
    type: "Desert Eagle",
    title: "Printstream",
    exterior: "FN",
    rarity: "milspec",
    float: 0.025,
    oldPrice: 98.0,
    price: 80.0,
    discount: 18,
    isST: false,
    isSV: false,
    popularity: 86,
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
    oldPrice: 74.0,
    price: 65.0,
    discount: 12,
    isST: false,
    isSV: false,
    popularity: 80,
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
    oldPrice: 110.0,
    price: 88.0,
    discount: 20,
    isST: true,
    isSV: false,
    popularity: 85,
    img: "/skins/ak47-empress.png",
    stickers: ["Star", "Star", "Star", "Star"],
  },
]

export type SaleAction = "bought" | "listed" | "traded" | "escrowed"

export const liveSalesPool: { item: string; action: SaleAction; price: string }[] = [
  { item: "★ Butterfly Knife | Fade", action: "bought", price: "$2,847.32" },
  { item: "M4A1-S | Imminent Danger", action: "listed", price: "$619.50" },
  { item: "StatTrak™ AK-47 | Vulcan", action: "traded", price: "$842.18" },
  { item: "Sticker | iBUYPOWER | Katowice 2014", action: "bought", price: "$12,400.00" },
  { item: "Souvenir AWP | Desert Hydra", action: "escrowed", price: "$1,189.99" },
  { item: "Glock-18 | Fade", action: "bought", price: "$1,472.45" },
  { item: "★ Karambit | Doppler", action: "listed", price: "$1,118.73" },
  { item: "USP-S | Kill Confirmed", action: "traded", price: "$93.67" },
]

export function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value)
}

export function steamMarketUrl(type: string, title: string, exterior: Exterior, hasFloat?: boolean): string {
  if (hasFloat === false) {
    // Agents and music kits: no exterior suffix
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
