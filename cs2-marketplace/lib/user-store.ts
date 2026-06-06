import { promises as fs } from "fs"
import path from "path"

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

async function readStore(): Promise<UsersStore> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8")
    const parsed = JSON.parse(raw) as UsersStore
    return { users: parsed.users ?? {} }
  } catch {
    return { ...EMPTY }
  }
}

async function writeStore(store: UsersStore): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf-8")
}

function defaultUser(): UserData {
  return { cartListingIds: [], wishlistListingIds: [] }
}

export async function getUserData(steamId: string): Promise<UserData> {
  const store = await readStore()
  return store.users[steamId] ?? defaultUser()
}

export async function updateUserData(
  steamId: string,
  patch: Partial<UserData>,
): Promise<UserData> {
  const store = await readStore()
  const current = store.users[steamId] ?? defaultUser()
  store.users[steamId] = { ...current, ...patch }
  await writeStore(store)
  return store.users[steamId]
}

export async function getUserTradeUrl(steamId: string): Promise<string | undefined> {
  const data = await getUserData(steamId)
  return data.tradeUrl?.trim() || undefined
}
