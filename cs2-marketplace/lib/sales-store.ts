import { promises as fs } from "fs"
import path from "path"
import type { Sale, SalesStore } from "@/lib/sale-types"
import { withStoreLock } from "@/lib/data-lock"

const DATA_DIR = path.join(process.cwd(), "data")
const DATA_PATH = path.join(DATA_DIR, "sales.json")

const EMPTY: SalesStore = { sales: [], nextId: 1 }

async function readSalesStoreUnsafe(): Promise<SalesStore> {
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

export async function readSalesStore(): Promise<SalesStore> {
  return withStoreLock("sales", readSalesStoreUnsafe)
}

export async function writeSalesStore(store: SalesStore): Promise<void> {
  await withStoreLock("sales", async () => {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf-8")
  })
}

export async function getSalesForSeller(sellerId: string): Promise<Sale[]> {
  const store = await readSalesStore()
  return store.sales.filter((s) => s.sellerId === sellerId)
}

export async function getSalesForBuyer(buyerId: string): Promise<Sale[]> {
  const store = await readSalesStore()
  return store.sales.filter((s) => s.buyerId === buyerId)
}
