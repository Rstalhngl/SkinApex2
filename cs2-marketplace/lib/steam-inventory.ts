import zlib from "zlib"
import { promisify } from "util"

const gunzip = promisify(zlib.gunzip)
const inflate = promisify(zlib.inflate)
const PAGE_SIZE = 2000
const STEAM_FETCH_MS = 20_000
const CACHE_MS = 90_000

interface SteamAsset {
  assetid: string
  classid: string
  instanceid: string
}

type AssetCacheEntry = { ids: Set<string>; at: number }
const assetCache = new Map<string, AssetCacheEntry>()

export type AssetOwnershipResult =
  | { ok: true }
  | { ok: false; error: "private" | "not_found" | "steam_unavailable" }

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
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "application/json",
      Referer: `https://steamcommunity.com/profiles/${steamId}/inventory/`,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(STEAM_FETCH_MS),
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

/** Cache asset IDs after a successful inventory fetch (e.g. from /api/inventory). */
export function cacheUserAssetIds(steamId: string, assetIds: Iterable<string>): void {
  assetCache.set(steamId, { ids: new Set(assetIds), at: Date.now() })
}

function getCachedAssetIds(steamId: string): Set<string> | null {
  const hit = assetCache.get(steamId)
  if (!hit || Date.now() - hit.at > CACHE_MS) return null
  return hit.ids
}

/** Returns all asset IDs in a user's CS2 inventory (up to 6000 items). */
export async function fetchUserAssetIds(steamId: string): Promise<Set<string>> {
  const cached = getCachedAssetIds(steamId)
  if (cached) return cached

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

  const ids = new Set(assets.map((a) => a.assetid))
  assetCache.set(steamId, { ids, at: Date.now() })
  return ids
}

export async function verifyAssetOwnership(
  steamId: string,
  assetId: string,
  opts?: { skipCache?: boolean },
): Promise<AssetOwnershipResult> {
  try {
    let ids: Set<string>
    if (opts?.skipCache) {
      assetCache.delete(steamId)
      ids = await fetchUserAssetIds(steamId)
    } else {
      ids = await fetchUserAssetIds(steamId)
    }
    if (ids.has(assetId)) return { ok: true }
    return { ok: false, error: "not_found" }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg === "private") return { ok: false, error: "private" }
    return { ok: false, error: "steam_unavailable" }
  }
}

/** @deprecated Use verifyAssetOwnership for structured errors. */
export async function userOwnsAsset(steamId: string, assetId: string): Promise<boolean> {
  const result = await verifyAssetOwnership(steamId, assetId)
  return result.ok
}
