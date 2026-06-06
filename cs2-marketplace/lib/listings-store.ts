import { promises as fs } from "fs"
import path from "path"
import type { Listing, ListingsStore } from "@/lib/listing-types"
import { withStoreLock } from "@/lib/data-lock"
import { getCounter, isDbEnabled, query, setCounter } from "@/lib/db"

const DATA_DIR = path.join(process.cwd(), "data")
const DATA_PATH = path.join(DATA_DIR, "listings.json")

const EMPTY: ListingsStore = { listings: [], nextId: 1 }

async function readListingsStoreJson(): Promise<ListingsStore> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8")
    const parsed = JSON.parse(raw) as ListingsStore
    if (!Array.isArray(parsed.listings)) return { ...EMPTY }
    return {
      listings: parsed.listings,
      nextId: typeof parsed.nextId === "number" ? parsed.nextId : 1,
    }
  } catch {
    return { ...EMPTY }
  }
}

async function readListingsStorePg(): Promise<ListingsStore> {
  const [rows, nextId] = await Promise.all([
    query<{ payload: Listing }>("SELECT payload FROM listings"),
    getCounter("listing_id"),
  ])
  return {
    listings: rows.rows.map((r) => r.payload),
    nextId,
  }
}

async function writeListingsStoreJson(store: ListingsStore): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf-8")
}

async function writeListingsStorePg(store: ListingsStore): Promise<void> {
  await setCounter("listing_id", store.nextId)
  for (const listing of store.listings) {
    await query(
      `INSERT INTO listings (id, payload) VALUES ($1, $2::jsonb)
       ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload`,
      [listing.id, JSON.stringify(listing)],
    )
  }
}

export async function readListingsStore(): Promise<ListingsStore> {
  if (isDbEnabled()) return readListingsStorePg()
  return withStoreLock("listings", readListingsStoreJson)
}

export async function writeListingsStore(store: ListingsStore): Promise<void> {
  if (isDbEnabled()) return writeListingsStorePg(store)
  return withStoreLock("listings", async () => writeListingsStoreJson(store))
}

export async function getActiveListingsFromStore(): Promise<Listing[]> {
  if (isDbEnabled()) {
    const res = await query<{ payload: Listing }>(
      `SELECT payload FROM listings WHERE payload->>'status' = 'active'
       ORDER BY (payload->>'listedAt')::bigint DESC`,
    )
    return res.rows.map((r) => r.payload)
  }
  const store = await readListingsStore()
  return store.listings.filter((l) => l.status === "active")
}
