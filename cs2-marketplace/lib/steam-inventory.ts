import zlib from "zlib"
import { promisify } from "util"

const gunzip = promisify(zlib.gunzip)
const inflate = promisify(zlib.inflate)
const PAGE_SIZE = 2000

interface SteamAsset {
  assetid: string
  classid: string
  instanceid: string
}

async function fetchPage(steamId: string, startAssetId?: string): Promise<{
  assets: SteamAsset[]
  more: boolean
  lastAssetId?: string
}> {
  const params = new URLSearchParams({ l: "english", count: String(PAGE_SIZE) })
  if (startAssetId) params.set("start_assetid", startAssetId)

  const url = `https://steamcommunity.com/inventory/${steamId}/730/2?${params}`
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "application/json",
      Referer: `https://steamcommunity.com/profiles/${steamId}/inventory/`,
    },
    cache: "no-store",
  })

  if (res.status === 403 || res.status === 401) throw new Error("private")
  if (!res.ok) throw new Error(`steam_${res.status}`)

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
    more: data.more === 1,
    lastAssetId: data.last_assetid,
  }
}

/** Returns all asset IDs in a user's CS2 inventory (up to 6000 items). */
export async function fetchUserAssetIds(steamId: string): Promise<Set<string>> {
  const page1 = await fetchPage(steamId)
  let assets = [...page1.assets]

  if (page1.more && page1.lastAssetId) {
    const page2 = await fetchPage(steamId, page1.lastAssetId)
    assets = [...assets, ...page2.assets]
    if (page2.more && page2.lastAssetId) {
      const page3 = await fetchPage(steamId, page2.lastAssetId)
      assets = [...assets, ...page3.assets]
    }
  }

  return new Set(assets.map((a) => a.assetid))
}

export async function userOwnsAsset(steamId: string, assetId: string): Promise<boolean> {
  try {
    const ids = await fetchUserAssetIds(steamId)
    return ids.has(assetId)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg === "private") return false
    throw e
  }
}
