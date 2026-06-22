import { promises as fs } from "fs"
import path from "path"
import { isDbEnabled, query } from "@/lib/db"

const DATA_DIR = path.join(process.cwd(), "data")
const DATA_PATH = path.join(DATA_DIR, "users.json")

export interface UserData {
  firstName?: string
  lastName?: string
  email?: string
  tradeUrl?: string
  cartListingIds: string[]
  wishlistListingIds: string[]
  tosAcceptedAt?: number
  tosVersion?: string
  savedIban?: string
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
  first_name: string | null
  last_name: string | null
  email: string | null
  trade_url: string | null
  cart_listing_ids: string[]
  wishlist_listing_ids: string[]
  tos_accepted_at: string | null
  tos_version: string | null
  saved_iban: string | null
}): UserData {
  return {
    firstName: row.first_name ?? undefined,
    lastName: row.last_name ?? undefined,
    email: row.email ?? undefined,
    tradeUrl: row.trade_url ?? undefined,
    cartListingIds: row.cart_listing_ids ?? [],
    wishlistListingIds: row.wishlist_listing_ids ?? [],
    tosAcceptedAt: row.tos_accepted_at ? Number(row.tos_accepted_at) : undefined,
    tosVersion: row.tos_version ?? undefined,
    savedIban: row.saved_iban ?? undefined,
  }
}

export async function getUserData(steamId: string): Promise<UserData> {
  if (isDbEnabled()) {
    const res = await query<{
      first_name: string | null
      last_name: string | null
      email: string | null
      trade_url: string | null
      cart_listing_ids: string[]
      wishlist_listing_ids: string[]
      tos_accepted_at: string | null
      tos_version: string | null
      saved_iban: string | null
    }>(
      `SELECT first_name, last_name, email, trade_url, cart_listing_ids, wishlist_listing_ids,
              tos_accepted_at, tos_version, saved_iban
       FROM users WHERE steam_id = $1`,
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
  const current = await getUserData(steamId)
  const next: UserData = {
    ...current,
    ...patch,
    cartListingIds: patch.cartListingIds ?? current.cartListingIds,
    wishlistListingIds: patch.wishlistListingIds ?? current.wishlistListingIds,
  }

  if (isDbEnabled()) {
    await query(
      `INSERT INTO users
        (steam_id, first_name, last_name, email, trade_url, cart_listing_ids, wishlist_listing_ids,
         tos_accepted_at, tos_version, saved_iban)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10)
       ON CONFLICT (steam_id) DO UPDATE SET
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         email = EXCLUDED.email,
         trade_url = EXCLUDED.trade_url,
         cart_listing_ids = EXCLUDED.cart_listing_ids,
         wishlist_listing_ids = EXCLUDED.wishlist_listing_ids,
         tos_accepted_at = EXCLUDED.tos_accepted_at,
         tos_version = EXCLUDED.tos_version,
         saved_iban = EXCLUDED.saved_iban`,
      [
        steamId,
        next.firstName ?? null,
        next.lastName ?? null,
        next.email ?? null,
        next.tradeUrl ?? null,
        JSON.stringify(next.cartListingIds),
        JSON.stringify(next.wishlistListingIds),
        next.tosAcceptedAt ?? null,
        next.tosVersion ?? null,
        next.savedIban ?? null,
      ],
    )
    return next
  }

  const store = await readStoreJson()
  store.users[steamId] = next
  await writeStoreJson(store)
  return next
}

export async function getUserTradeUrl(steamId: string): Promise<string | undefined> {
  const data = await getUserData(steamId)
  return data.tradeUrl?.trim() || undefined
}
