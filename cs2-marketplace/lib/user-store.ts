import { promises as fs } from "fs"
import path from "path"
import { isDbEnabled, query } from "@/lib/db"

const DATA_DIR = path.join(process.cwd(), "data")
const DATA_PATH = path.join(DATA_DIR, "users.json")

export interface UserData {
  tradeUrl?: string
  cartListingIds: string[]
  wishlistListingIds: string[]
}

interface UsersStore {
  users: Record<string, UserData>
}

const EMPTY: UsersStore = { users: {} }

function defaultUser(): UserData {
  return { cartListingIds: [], wishlistListingIds: [] }
}

async function readStoreJson(): Promise<UsersStore> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8")
    const parsed = JSON.parse(raw) as UsersStore
    return { users: parsed.users ?? {} }
  } catch {
    return { ...EMPTY }
  }
}

async function writeStoreJson(store: UsersStore): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf-8")
}

function rowToUserData(row: {
  trade_url: string | null
  cart_listing_ids: string[]
  wishlist_listing_ids: string[]
}): UserData {
  return {
    tradeUrl: row.trade_url ?? undefined,
    cartListingIds: row.cart_listing_ids ?? [],
    wishlistListingIds: row.wishlist_listing_ids ?? [],
  }
}

export async function getUserData(steamId: string): Promise<UserData> {
  if (isDbEnabled()) {
    const res = await query<{
      trade_url: string | null
      cart_listing_ids: string[]
      wishlist_listing_ids: string[]
    }>(
      "SELECT trade_url, cart_listing_ids, wishlist_listing_ids FROM users WHERE steam_id = $1",
      [steamId],
    )
    if (!res.rows[0]) return defaultUser()
    return rowToUserData(res.rows[0])
  }
  const store = await readStoreJson()
  return store.users[steamId] ?? defaultUser()
}

export async function updateUserData(
  steamId: string,
  patch: Partial<UserData>,
): Promise<UserData> {
  if (isDbEnabled()) {
    const current = await getUserData(steamId)
    const next = { ...current, ...patch }
    await query(
      `INSERT INTO users (steam_id, trade_url, cart_listing_ids, wishlist_listing_ids)
       VALUES ($1, $2, $3::jsonb, $4::jsonb)
       ON CONFLICT (steam_id) DO UPDATE SET
         trade_url = EXCLUDED.trade_url,
         cart_listing_ids = EXCLUDED.cart_listing_ids,
         wishlist_listing_ids = EXCLUDED.wishlist_listing_ids`,
      [
        steamId,
        next.tradeUrl ?? null,
        JSON.stringify(next.cartListingIds),
        JSON.stringify(next.wishlistListingIds),
      ],
    )
    return next
  }

  const store = await readStoreJson()
  const current = store.users[steamId] ?? defaultUser()
  store.users[steamId] = { ...current, ...patch }
  await writeStoreJson(store)
  return store.users[steamId]
}

export async function getUserTradeUrl(steamId: string): Promise<string | undefined> {
  const data = await getUserData(steamId)
  return data.tradeUrl?.trim() || undefined
}
