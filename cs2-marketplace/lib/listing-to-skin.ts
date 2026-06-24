import { computeMarketDiscount } from "@/lib/cs2-api"
import { itemHasFloat, resolveListingFloat } from "@/lib/item-wear"
import type { Listing } from "@/lib/listing-types"
import { resolveItemType, type Exterior, type Skin } from "@/lib/skins"

const EXTERIOR_MAP: Record<string, Exterior> = {
  FN: "FN", MW: "MW", FT: "FT", WW: "WW", BS: "BS",
  "Factory New": "FN",
  "Minimal Wear": "MW",
  "Field-Tested": "FT",
  "Well-Worn": "WW",
  "Battle-Scarred": "BS",
}

function normalizeExterior(raw: string): Exterior {
  return EXTERIOR_MAP[raw] ?? EXTERIOR_MAP[raw.trim()] ?? "FT"
}

function stableSkinId(listingId: string): number {
  const suffix = listingId.replace(/^listing-/, "")
  const parsed = parseInt(suffix, 10)
  if (Number.isFinite(parsed)) return parsed + 100_000

  let hash = 0
  for (let i = 0; i < listingId.length; i++) {
    hash = (hash * 31 + listingId.charCodeAt(i)) >>> 0
  }
  return 100_000 + (hash % 900_000)
}

export function listingToSkin(listing: Listing): Skin & { listingId: string } {
  const exterior = normalizeExterior(listing.exterior)
  const rarityKey = listing.rarity.toLowerCase().replace(/ /g, "_").replace(/-/g, "_")
  const rarityMap: Record<string, Skin["rarity"]> = {
    covert: "covert", classified: "classified", restricted: "restricted",
    mil_spec_grade: "milspec", industrial_grade: "industrial",
    contraband: "contraband", consumer_grade: "industrial",
    extraordinary: "covert", master: "covert", superior: "classified",
    exceptional: "restricted", high_grade: "milspec", remarkable: "restricted",
    distinguished: "milspec", base_grade: "industrial",
  }
  const rarity = rarityMap[rarityKey] ?? "milspec"

  const type = resolveItemType(listing.type, listing.name, listing.marketHashName)
  const nameParts = (listing.name ?? "")
    .replace("StatTrak™ ", "").replace("Souvenir ", "").split(" | ")
  const title = nameParts.slice(1).join(" | ").replace(/\s*\([^)]+\)\s*$/, "").trim()
    || (listing.name ?? "").replace(/\s*\([^)]+\)\s*$/, "")

  const hasFloat = itemHasFloat(type, listing.name, listing.marketHashName)
  const { discount, priceUsd, refPriceTry } = computeMarketDiscount(
    listing.priceTry,
    listing.marketHashName,
  )

  return {
    id: stableSkinId(listing.id),
    listingId: listing.id,
    sellerId: listing.sellerId,
    owner: "other",
    type,
    title: title || type,
    exterior,
    rarity,
    float: resolveListingFloat(exterior, listing.float, hasFloat),
    oldPrice: refPriceTry ?? Math.round(listing.priceTry * 1.1),
    price: listing.priceTry,
    priceUsd,
    discount,
    isST: listing.stattrak,
    isSV: listing.souvenir,
    popularity: 50,
    listedAt: listing.listedAt,
    img: listing.img || "/placeholder.svg",
    stickers: [],
    hasFloat,
    patternSeed: hasFloat ? listing.patternSeed : undefined,
    phase: hasFloat ? listing.phase : undefined,
    marketHashName: listing.marketHashName,
  }
}
