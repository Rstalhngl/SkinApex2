import { NextRequest, NextResponse } from "next/server"
import zlib from "zlib"
import { promisify } from "util"

const gunzip = promisify(zlib.gunzip)
const inflate = promisify(zlib.inflate)

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
    const type = tags["Type"] || desc.type || ""

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
    })
  }

  items.sort((a, b) => {
    if (a.tradable !== b.tradable) return a.tradable ? -1 : 1
    return RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)
  })

  return items
}

export async function GET(request: NextRequest) {
  const steamId = request.nextUrl.searchParams.get("steamId")
  
  // 📍 1. TAKİP LOGU: Sunucuya hangi Steam ID parametresi geliyor görelim
  console.log("===> ENVANTERI CEKILEN STEAM ID:", steamId);

  if (!steamId) return NextResponse.json({ error: "steamId required" }, { status: 400 })

  // 📍 2. API KEY ENTEGRASYONU: Steam API anahtarını .env dosyasından okuyoruz
  const apiKey = process.env.STEAM_API_KEY
  
  // Eğer API anahtarı varsa URL'in sonuna güvenli şekilde ekliyoruz (Valve doğrulaması için)
  const url = apiKey 
    ? `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=5000&key=${apiKey}`
    : `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=5000`

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": `https://steamcommunity.com/profiles/${steamId}/inventory/`,
        "X-Requested-With": "XMLHttpRequest",
        "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
      },
      cache: "no-store",
    })

    // 📍 3. DURUM LOGU: Steam sunucusunun sitemize verdiği gerçek cevabı görelim
    console.log(`===> STEAM RESPONDED WITH STATUS: ${res.status}`);

    if (res.status === 403 || res.status === 401) {
      return NextResponse.json({ error: "private", items: [] })
    }
    if (!res.ok) {
      return NextResponse.json({ error: `steam_${res.status}`, items: [] })
    }

    const buffer = Buffer.from(await res.arrayBuffer())
    const encoding = res.headers.get("content-encoding") || ""

    let jsonStr: string
    try {
      if (encoding.includes("gzip")) {
        jsonStr = (await gunzip(buffer)).toString("utf-8")
      } else if (encoding.includes("deflate")) {
        jsonStr = (await inflate(buffer)).toString("utf-8")
      } else {
        jsonStr = buffer.toString("utf-8")
      }
    } catch {
      jsonStr = buffer.toString("utf-8")
    }

    if (!jsonStr || jsonStr.trim() === "null") {
      console.log("===> STEAM RETURNED NULL RESPONSE");
      return NextResponse.json({ error: "private", items: [] })
    }

    const data = JSON.parse(jsonStr)
    if (!data || data.success === false) {
      return NextResponse.json({ error: "private", items: [] })
    }

    const items = parseInventory(data.assets || [], data.descriptions || [])
    console.log(`===> SUCCESS: ${items.length} adet item basariyla listelendi.`);
    return NextResponse.json({ items, total: data.total_inventory_count || items.length })

  } catch (e) {
    console.error("Inventory fetch error:", e)
    return NextResponse.json({ error: "fetch_failed", items: [] })
  }
}