import { promises as fs } from "fs"
import path from "path"
import type { OffersStore, StoredOffer } from "@/lib/offer-types"
import { getCounter, isDbEnabled, query, setCounter } from "@/lib/db"

const DATA_DIR = path.join(process.cwd(), "data")
const DATA_PATH = path.join(DATA_DIR, "offers.json")

const EMPTY: OffersStore = { offers: [], nextId: 1 }

async function readOffersStoreJson(): Promise<OffersStore> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8")
    const parsed = JSON.parse(raw) as OffersStore
    if (!Array.isArray(parsed.offers)) return { ...EMPTY }
    return {
      offers: parsed.offers,
      nextId: typeof parsed.nextId === "number" ? parsed.nextId : 1,
    }
  } catch {
    return { ...EMPTY }
  }
}

async function readOffersStorePg(): Promise<OffersStore> {
  const [rows, nextId] = await Promise.all([
    query<{ payload: StoredOffer }>(
      "SELECT payload FROM offers ORDER BY (payload->>'createdAt')::bigint DESC",
    ),
    getCounter("offer_id"),
  ])
  return {
    offers: rows.rows.map((r) => r.payload),
    nextId,
  }
}

async function writeOffersStoreJson(store: OffersStore): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf-8")
}

async function writeOffersStorePg(store: OffersStore): Promise<void> {
  await setCounter("offer_id", store.nextId)
  for (const offer of store.offers) {
    await query(
      `INSERT INTO offers (id, payload) VALUES ($1, $2::jsonb)
       ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload`,
      [offer.id, JSON.stringify(offer)],
    )
  }
}

export async function readOffersStore(): Promise<OffersStore> {
  if (isDbEnabled()) return readOffersStorePg()
  return readOffersStoreJson()
}

export async function writeOffersStore(store: OffersStore): Promise<void> {
  if (isDbEnabled()) return writeOffersStorePg(store)
  return writeOffersStoreJson(store)
}

export async function getOffersForUser(steamId: string): Promise<StoredOffer[]> {
  if (isDbEnabled()) {
    const res = await query<{ payload: StoredOffer }>(
      `SELECT payload FROM offers
       WHERE payload->>'sellerId' = $1 OR payload->>'buyerId' = $1
       ORDER BY (payload->>'createdAt')::bigint DESC`,
      [steamId],
    )
    return res.rows.map((r) => r.payload)
  }
  const store = await readOffersStore()
  return store.offers.filter(
    (o) => o.sellerId === steamId || o.buyerId === steamId,
  )
}
