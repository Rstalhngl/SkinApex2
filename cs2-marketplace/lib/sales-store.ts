import { promises as fs } from "fs"
import path from "path"
import type { Sale, SalesStore } from "@/lib/sale-types"
import { withStoreLock } from "@/lib/data-lock"
import { getCounter, isDbEnabled, query, setCounter } from "@/lib/db"

const DATA_DIR = path.join(process.cwd(), "data")
const DATA_PATH = path.join(DATA_DIR, "sales.json")

const EMPTY: SalesStore = { sales: [], nextId: 1 }

async function readSalesStoreJson(): Promise<SalesStore> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8")
    const parsed = JSON.parse(raw) as SalesStore
    if (!Array.isArray(parsed.sales)) return { ...EMPTY }
    return {
      sales: parsed.sales,
      nextId: typeof parsed.nextId === "number" ? parsed.nextId : 1,
    }
  } catch {
    return { ...EMPTY }
  }
}

async function readSalesStorePg(): Promise<SalesStore> {
  const [rows, nextId] = await Promise.all([
    query<{ payload: Sale }>(
      "SELECT payload FROM sales ORDER BY (payload->>'soldAt')::bigint DESC",
    ),
    getCounter("sale_id"),
  ])
  return {
    sales: rows.rows.map((r) => r.payload),
    nextId,
  }
}

async function writeSalesStoreJson(store: SalesStore): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf-8")
}

async function writeSalesStorePg(store: SalesStore): Promise<void> {
  await setCounter("sale_id", store.nextId)
  for (const sale of store.sales) {
    await query(
      `INSERT INTO sales (id, payload) VALUES ($1, $2::jsonb)
       ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload`,
      [sale.id, JSON.stringify(sale)],
    )
  }
}

export async function readSalesStore(): Promise<SalesStore> {
  if (isDbEnabled()) return readSalesStorePg()
  return withStoreLock("sales", readSalesStoreJson)
}

export async function writeSalesStore(store: SalesStore): Promise<void> {
  if (isDbEnabled()) return writeSalesStorePg(store)
  return withStoreLock("sales", async () => writeSalesStoreJson(store))
}

export async function getSalesForSeller(sellerId: string): Promise<Sale[]> {
  if (isDbEnabled()) {
    const res = await query<{ payload: Sale }>(
      `SELECT payload FROM sales WHERE payload->>'sellerId' = $1
       ORDER BY (payload->>'soldAt')::bigint DESC`,
      [sellerId],
    )
    return res.rows.map((r) => r.payload)
  }
  const store = await readSalesStore()
  return store.sales.filter((s) => s.sellerId === sellerId)
}

export async function getSalesForBuyer(buyerId: string): Promise<Sale[]> {
  if (isDbEnabled()) {
    const res = await query<{ payload: Sale }>(
      `SELECT payload FROM sales WHERE payload->>'buyerId' = $1
       ORDER BY (payload->>'soldAt')::bigint DESC`,
      [buyerId],
    )
    return res.rows.map((r) => r.payload)
  }
  const store = await readSalesStore()
  return store.sales.filter((s) => s.buyerId === buyerId)
}
