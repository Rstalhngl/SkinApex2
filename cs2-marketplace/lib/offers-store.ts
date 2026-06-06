import { promises as fs } from "fs"
import path from "path"
import type { OffersStore, StoredOffer } from "@/lib/offer-types"

const DATA_DIR = path.join(process.cwd(), "data")
const DATA_PATH = path.join(DATA_DIR, "offers.json")

const EMPTY: OffersStore = { offers: [], nextId: 1 }

export async function readOffersStore(): Promise<OffersStore> {
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

export async function writeOffersStore(store: OffersStore): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf-8")
}

export async function getOffersForUser(steamId: string): Promise<StoredOffer[]> {
  const store = await readOffersStore()
  return store.offers.filter(
    (o) => o.sellerId === steamId || o.buyerId === steamId,
  )
}
