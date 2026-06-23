import { getActivePresenceSteamIds } from "@/lib/presence-store"

function getWsInternalBase(): string | null {
  const port = process.env.WS_PORT?.trim() || "3001"
  const host = process.env.WS_INTERNAL_HOST?.trim() || "127.0.0.1"
  return `http://${host}:${port}`
}

function getWsApiKey(): string | null {
  return process.env.WS_API_KEY?.trim() || null
}

interface WsStats {
  connections: number
  activeUsers: number
}

async function fetchWsStats(): Promise<WsStats | null> {
  const base = getWsInternalBase()
  const key = getWsApiKey()
  if (!base || !key) return null

  try {
    const res = await fetch(`${base}/internal/stats`, {
      headers: { "x-ws-key": key },
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    })
    if (!res.ok) return null
    const data = (await res.json()) as { connections?: number; activeUsers?: number }
    return {
      connections: Number(data.connections ?? 0),
      activeUsers: Number(data.activeUsers ?? 0),
    }
  } catch {
    return null
  }
}

export interface ActiveUserStats {
  activeUsers: number
  wsConnections: number
}

/** Unique logged-in users active in the last 5 minutes (WS + HTTP presence). */
export async function getActiveUserStats(): Promise<ActiveUserStats> {
  const [wsStats, presenceIds] = await Promise.all([
    fetchWsStats(),
    Promise.resolve(getActivePresenceSteamIds()),
  ])

  const wsAuthenticated = wsStats?.activeUsers ?? 0
  const presenceCount = presenceIds.size

  return {
    activeUsers: Math.max(presenceCount, wsAuthenticated),
    wsConnections: wsStats?.connections ?? 0,
  }
}
