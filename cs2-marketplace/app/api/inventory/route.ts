import { NextRequest, NextResponse } from "next/server"

const STEAM_IMG = "https://community.akamai.steamstatic.com/economy/image/"

interface SteamAsset {
  appid: number
  classid: string
  instanceid: string
  assetid: string
  amount: string
}

interface SteamDescription {
  classid: string
  instanceid: string
  name: string
  market_hash_name: string
  tradable: number
  marketable: number
  icon_url: string
  type: string
  tags: { category: string; internal_name: string; localized_tag_name: string }[]
  descriptions?: { type: string; value: string }[]
}

export interface InventoryItem {
  assetId: string
  name: string
  marketHashName: string
  tradable: boolean
  marketable: boolean
  img: string
  exterior: string
  rarity: string
  rarityColor: string
  type: string
  stattrak: boolean
  souvenir: boolean
}

function parseInventory(assets: SteamAsset[], descriptions: SteamDescription[]): InventoryItem[] {
  const descMap = new Map<string, SteamDescription>()
  for (const d of descriptions) {
    descMap.set(`${d.classid}_${d.instanceid}`, d)
  }

  const RARITY_COLORS: Record<string, string> = {
    "Contraband": "#e4ae39",
    "Covert": "#eb4b4b",
    "Classified": "#d32ce6",
    "Restricted": "#8847ff",
    "Mil-Spec Grade": "#4b69ff",
    "Industrial Grade": "#5e98d9",
    "Base Grade": "#b0c3d9",
    "Consumer Grade": "#b0c3d9",
    "High Grade": "#4b69ff",
    "Remarkable": "#8847ff",
    "Exotic": "#d32ce6",
    "Extraordinary": "#eb4b4b",
    "Distinguished": "#4b69ff",
    "Exceptional": "#8847ff",
    "Superior": "#d32ce6",
    "Master": "#eb4b4b",
  }

  const items: InventoryItem[] = []

  for (const asset of assets) {
    const desc = descMap.get(`${asset.classid}_${asset.instanceid}`)
    if (!desc) continue

    const tags: Record<string, string> = {}
    const tagColors: Record<string, string> = {}
    for (const tag of (desc.tags || [])) {
      tags[tag.category] = tag.localized_tag_name
    }

    const rarity = tags["Rarity"] || tags["Quality"] || ""
    const exterior = tags["Exterior"] || ""
    const type = tags["Type"] || desc.type || ""

    const stattrak = desc.name.includes("StatTrak™")
    const souvenir = desc.name.includes("Souvenir")

    items.push({
      assetId: asset.assetid,
      name: desc.name,
      marketHashName: desc.market_hash_name,
      tradable: desc.tradable === 1,
      marketable: desc.marketable === 1,
      img: desc.icon_url ? `${STEAM_IMG}${desc.icon_url}` : "/placeholder.svg",
      exterior,
      rarity,
      rarityColor: RARITY_COLORS[rarity] || "#b0c3d9",
      type,
      stattrak,
      souvenir,
    })
  }

  return items
}

export async function GET(request: NextRequest) {
  const steamId = request.nextUrl.searchParams.get("steamId")
  if (!steamId) {
    return NextResponse.json({ error: "steamId required" }, { status: 400 })
  }

  try {
    // Try different count values & no caching to avoid stale results
    const res = await fetch(
      `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=5000&norender=0`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "application/json",
          "Referer": `https://steamcommunity.com/profiles/${steamId}/inventory/`,
          "X-Requested-With": "XMLHttpRequest",
        },
        cache: "no-store",
      }
    )

    if (res.status === 403 || res.status === 401) {
      return NextResponse.json({ error: "private", items: [] }, { status: 200 })
    }
    if (!res.ok) {
      return NextResponse.json({ error: `steam_${res.status}`, items: [] }, { status: 200 })
    }

    const data = await res.json()
    if (!data || data === null) {
      return NextResponse.json({ error: "private", items: [] }, { status: 200 })
    }

    const items = parseInventory(data.assets || [], data.descriptions || [])

    // Sort: tradable first, then by rarity (covert > classified > ...)
    const RARITY_ORDER = ["Contraband", "Covert", "Extraordinary", "Classified", "Superior", "Restricted", "Exotic", "Mil-Spec Grade", "Remarkable", "Exceptional", "Industrial Grade", "Distinguished", "High Grade", "Consumer Grade", "Base Grade"]
    items.sort((a, b) => {
      if (a.tradable !== b.tradable) return a.tradable ? -1 : 1
      return RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)
    })

    return NextResponse.json({ items, total: data.total_inventory_count || items.length })
  } catch (e) {
    return NextResponse.json({ error: "fetch_failed", items: [] }, { status: 200 })
  }
}
