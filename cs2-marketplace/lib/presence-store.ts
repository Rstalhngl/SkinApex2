const PRESENCE_TTL_MS = 5 * 60 * 1000

const lastSeen = new Map<string, number>()

function prune(now = Date.now()): void {
  for (const [steamId, ts] of lastSeen) {
    if (now - ts > PRESENCE_TTL_MS) lastSeen.delete(steamId)
  }
}

export function touchPresence(steamId: string): void {
  lastSeen.set(steamId, Date.now())
  if (lastSeen.size > 5000) prune()
}

export function getActivePresenceSteamIds(): Set<string> {
  const now = Date.now()
  const active = new Set<string>()
  for (const [steamId, ts] of lastSeen) {
    if (now - ts > PRESENCE_TTL_MS) {
      lastSeen.delete(steamId)
      continue
    }
    active.add(steamId)
  }
  return active
}

export function getActivePresenceCount(): number {
  return getActivePresenceSteamIds().size
}
