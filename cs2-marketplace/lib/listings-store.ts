import { promises as fs } from "fs"
import path from "path"
import type { Listing, ListingsStore } from "@/lib/listing-types"
import { withStoreLock } from "@/lib/data-lock"

const DATA_DIR = path.join(process.cwd(), "data")
const DATA_PATH = path.join(DATA_DIR, "listings.json")

const EMPTY: ListingsStore = { listings: [], nextId: 1 }

async function readListingsStoreUnsafe(): Promise<ListingsStore> {
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

export async function readListingsStore(): Promise<ListingsStore> {
  return withStoreLock("listings", readListingsStoreUnsafe)
}

export async function writeListingsStore(store: ListingsStore): Promise<void> {
  await withStoreLock("listings", async () => {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf-8")
  })
}

export async function getActiveListingsFromStore(): Promise<Listing[]> {
  const store = await readListingsStore()
  return store.listings.filter((l) => l.status === "active")
}
