import type { InventoryItem } from "@/lib/inventory-types"
import {
  itemHasFloat, parseAssetWear, resolveItemPhase,
} from "@/lib/item-wear"
import { resolveItemType } from "@/lib/skins"
import { NextRequest, NextResponse } from "next/server"
import zlib from "zlib"
import { promisify } from "util"
import { cacheUserAssetIds } from "@/lib/steam-inventory"
import { cancelActiveListingsForSeller } from "@/lib/listings-store"
import { publishListingsChanged } from "@/lib/ws-publish"
import { isSession, requireSession } from "@/lib/api-auth"

const gunzip = promisify(zlib.gunzip)
const inflate = promisify(zlib.inflate)

const STEAM_IMG = "https://community.akamai.steamstatic.com/economy/image/"
const PAGE_SIZE = 2000  // Steam's maximum per request
const STEAM_FETCH_MS = 20_000

interface SteamAsset {
  appid: number
  classid: string
  instanceid: string
  assetid: string
  amount: string
  asset_properties?: { propertyid: number; int_value?: string; float_value?: string }[]
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

const RARITY_ORDER = [
  "Contraband", "Covert", "Extraordinary", "Master", "Classified", "Superior",
  "Restricted", "Exotic", "Exceptional", "Mil-Spec Grade", "Remarkable",
  "Distinguished", "Industrial Grade", "High Grade", "Consumer Grade", "Base Grade",
]

async function fetchPage(steamId: string, startAssetId?: string): Promise<{
  assets: SteamAsset[]
  descriptions: SteamDescription[]
  total: number
  more: boolean
  lastAssetId?: string
}> {
  const params = new URLSearchParams({
    l: "english",
    count: String(PAGE_SIZE),
  })
  if (startAssetId) params.set("start_assetid", startAssetId)

  const url = `https://steamcommunity.com/inventory/${steamId}/730/2?${params}`

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "application/json",
      "Referer": `https://steamcommunity.com/profiles/${steamId}/inventory/`,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(STEAM_FETCH_MS),
  })

  if (res.status === 403 || res.status === 401) throw new Error("private")
  if (!res.ok) throw new Error(`steam_${res.status}`)

  // Decompress if needed
  const buffer = Buffer.from(await res.arrayBuffer())
  const encoding = res.headers.get("content-encoding") || ""

  let jsonStr: string
  try {
    if (encoding.includes("gzip")) jsonStr = (await gunzip(buffer)).toString("utf-8")
    else if (encoding.includes("deflate")) jsonStr = (await inflate(buffer)).toString("utf-8")
    else jsonStr = buffer.toString("utf-8")
  } catch {
    jsonStr = buffer.toString("utf-8")
  }

  if (!jsonStr || jsonStr.trim() === "null") throw new Error("private")

  const data = JSON.parse(jsonStr)
  if (!data || data.success === false) throw new Error("private")

  return {
    assets: data.assets || [],
    descriptions: data.descriptions || [],
    total: data.total_inventory_count || 0,
    more: data.more === 1,
    lastAssetId: data.last_assetid,
  }
}

function parseInventory(assets: SteamAsset[], descriptions: SteamDescription[]): InventoryItem[] {
  const descMap = new Map<string, SteamDescription>()
  for (const d of descriptions) {
    descMap.set(`${d.classid}_${d.instanceid}`, d)
  }

  const items: InventoryItem[] = []
  for (const asset of assets) {
    const desc = descMap.get(`${asset.classid}_${asset.instanceid}`)
    if (!desc) continue

    const tags: Record<string, string> = {}
    for (const tag of (desc.tags || [])) {
      tags[tag.category] = tag.localized_tag_name
    }

    const rarity = tags["Rarity"] || tags["Quality"] || ""
    const exterior = tags["Exterior"] || ""
    const type = resolveItemType(
      tags["Type"] || desc.type || "",
      desc.name,
      desc.market_hash_name,
    )
    const hasFloat = itemHasFloat(type, desc.name, desc.market_hash_name)
    const wear = parseAssetWear(asset.asset_properties)
    const phase = resolveItemPhase(desc.tags, desc.name, desc.market_hash_name)

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
      stattrak: desc.name.includes("StatTrak™"),
      souvenir: desc.name.includes("Souvenir"),
      hasFloat,
      float: hasFloat ? wear.float : undefined,
      patternSeed: hasFloat ? wear.patternSeed : undefined,
      phase: hasFloat ? phase : undefined,
    })
  }

  items.sort((a, b) => {
    if (a.tradable !== b.tradable) return a.tradable ? -1 : 1
    return RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)
  })

  return items
}

export async function GET(request: NextRequest) {
  const session = await requireSession()
  if (!isSession(session)) return session

  const steamId = request.nextUrl.searchParams.get("steamId")
  if (!steamId) return NextResponse.json({ error: "steamId required" }, { status: 400 })
  if (steamId !== session.steamId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  try {
    // Fetch first page
    const page1 = await fetchPage(steamId)
    let allAssets = [...page1.assets]
    let allDescriptions = [...page1.descriptions]
    const total = page1.total

    // If inventory has more pages, fetch them (up to 3 pages = 6000 items max)
    if (page1.more && page1.lastAssetId) {
      const page2 = await fetchPage(steamId, page1.lastAssetId)
      allAssets = [...allAssets, ...page2.assets]
      allDescriptions = [...allDescriptions, ...page2.descriptions]

      if (page2.more && page2.lastAssetId) {
        const page3 = await fetchPage(steamId, page2.lastAssetId)
        allAssets = [...allAssets, ...page3.assets]
        allDescriptions = [...allDescriptions, ...page3.descriptions]
      }
    }

    const items = parseInventory(allAssets, allDescriptions)
    cacheUserAssetIds(steamId, items.map((item) => item.assetId))
    return NextResponse.json({ items, total })

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg === "private") {
      const listingsClosed = await cancelActiveListingsForSeller(steamId)
      if (listingsClosed > 0) publishListingsChanged()
      return NextResponse.json({ error: "private", items: [], listingsClosed })
    }
    if (msg.startsWith("steam_")) return NextResponse.json({ error: msg, items: [] })
    if (msg.includes("TimeoutError") || msg.includes("aborted")) {
      return NextResponse.json({ error: "timeout", items: [] })
    }
    console.error("Inventory fetch error:", e)
    return NextResponse.json({ error: "fetch_failed", items: [] })
  }
}
