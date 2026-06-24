import { promises as fs } from "fs"
import path from "path"
import { isDbEnabled, query } from "@/lib/db"

const DATA_DIR = path.join(process.cwd(), "data")
const DATA_PATH = path.join(DATA_DIR, "moderation.json")

interface ModerationStore {
  listingBannedUntil: Record<string, number>
}

const EMPTY: ModerationStore = { listingBannedUntil: {} }

async function readStoreJson(): Promise<ModerationStore> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8")
    const parsed = JSON.parse(raw) as ModerationStore
    return { listingBannedUntil: parsed.listingBannedUntil ?? {} }
  } catch {
    return { ...EMPTY }
  }
}

async function writeStoreJson(store: ModerationStore): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf-8")
}

export async function getListingBannedUntil(steamId: string): Promise<number | null> {
  if (isDbEnabled()) {
    const res = await query<{ listing_banned_until: string | null }>(
      "SELECT listing_banned_until FROM users WHERE steam_id = $1",
      [steamId],
    )
    const val = res.rows[0]?.listing_banned_until
    return val != null ? Number(val) : null
  }
  const store = await readStoreJson()
  return store.listingBannedUntil[steamId] ?? null
}

export async function isListingBanned(steamId: string): Promise<boolean> {
  const until = await getListingBannedUntil(steamId)
  return !!until && until > Date.now()
}

export async function setListingBan(steamId: string, untilMs: number): Promise<void> {
  if (isDbEnabled()) {
    await query(
      `INSERT INTO users (steam_id, trade_url, cart_listing_ids, wishlist_listing_ids, listing_banned_until)
       VALUES ($1, NULL, '[]'::jsonb, '[]'::jsonb, $2)
       ON CONFLICT (steam_id) DO UPDATE SET listing_banned_until = EXCLUDED.listing_banned_until`,
      [steamId, untilMs],
    )
    return
  }
  const store = await readStoreJson()
  store.listingBannedUntil[steamId] = untilMs
  await writeStoreJson(store)
}

export async function clearListingBan(steamId: string): Promise<void> {
  if (isDbEnabled()) {
    await query(
      `UPDATE users SET listing_banned_until = NULL WHERE steam_id = $1`,
      [steamId],
    )
    return
  }
  const store = await readStoreJson()
  delete store.listingBannedUntil[steamId]
  await writeStoreJson(store)
}

export async function listActiveListingBans(): Promise<{ steamId: string; untilMs: number }[]> {
  const now = Date.now()
  if (isDbEnabled()) {
    const res = await query<{ steam_id: string; listing_banned_until: string }>(
      `SELECT steam_id, listing_banned_until FROM users
       WHERE listing_banned_until IS NOT NULL AND listing_banned_until > $1`,
      [now],
    )
    return res.rows.map((r) => ({
      steamId: r.steam_id,
      untilMs: Number(r.listing_banned_until),
    }))
  }
  const store = await readStoreJson()
  return Object.entries(store.listingBannedUntil)
    .filter(([, until]) => until > now)
    .map(([steamId, untilMs]) => ({ steamId, untilMs }))
}
