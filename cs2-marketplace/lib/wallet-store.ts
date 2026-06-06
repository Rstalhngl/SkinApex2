import { promises as fs } from "fs"
import path from "path"
import { withStoreLock } from "@/lib/data-lock"

const DATA_DIR = path.join(process.cwd(), "data")
const DATA_PATH = path.join(DATA_DIR, "wallets.json")

export type WalletTxType =
  | "deposit"
  | "withdraw"
  | "purchase"
  | "refund"
  | "sale_payout"
  | "offer_purchase"

export interface WalletTransaction {
  id: string
  steamId: string
  type: WalletTxType
  amount: number
  balanceAfter: number
  refId?: string
  note?: string
  createdAt: number
}

interface WalletEntry {
  balance: number
}

interface WalletStore {
  wallets: Record<string, WalletEntry>
  transactions: WalletTransaction[]
  nextTxId: number
}

const EMPTY: WalletStore = { wallets: {}, transactions: [], nextTxId: 1 }

async function readStoreUnsafe(): Promise<WalletStore> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8")
    const parsed = JSON.parse(raw) as WalletStore
    return {
      wallets: parsed.wallets ?? {},
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      nextTxId: typeof parsed.nextTxId === "number" ? parsed.nextTxId : 1,
    }
  } catch {
    return { ...EMPTY }
  }
}

async function readStore(): Promise<WalletStore> {
  return withStoreLock("wallets", readStoreUnsafe)
}

async function writeStore(store: WalletStore): Promise<void> {
  await withStoreLock("wallets", async () => {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf-8")
  })
}

function ensureWallet(store: WalletStore, steamId: string): WalletEntry {
  if (!store.wallets[steamId]) {
    store.wallets[steamId] = { balance: 0 }
  }
  return store.wallets[steamId]
}

export async function getWalletBalance(steamId: string): Promise<number> {
  const store = await readStore()
  return store.wallets[steamId]?.balance ?? 0
}

export async function creditWallet(
  steamId: string,
  amount: number,
  type: WalletTxType,
  refId?: string,
  note?: string,
): Promise<{ ok: true; balance: number } | { ok: false; error: string }> {
  if (amount <= 0) return { ok: false, error: "invalid_amount" }

  const store = await readStore()
  const wallet = ensureWallet(store, steamId)
  wallet.balance = Math.round((wallet.balance + amount) * 100) / 100

  store.transactions.unshift({
    id: `tx-${store.nextTxId++}`,
    steamId,
    type,
    amount,
    balanceAfter: wallet.balance,
    refId,
    note,
    createdAt: Date.now(),
  })
  store.transactions = store.transactions.slice(0, 500)

  await writeStore(store)
  return { ok: true, balance: wallet.balance }
}

export async function debitWallet(
  steamId: string,
  amount: number,
  type: WalletTxType,
  refId?: string,
  note?: string,
): Promise<{ ok: true; balance: number } | { ok: false; error: string }> {
  if (amount <= 0) return { ok: false, error: "invalid_amount" }

  const store = await readStore()
  const wallet = ensureWallet(store, steamId)
  if (wallet.balance < amount) return { ok: false, error: "insufficient_balance" }

  wallet.balance = Math.round((wallet.balance - amount) * 100) / 100

  store.transactions.unshift({
    id: `tx-${store.nextTxId++}`,
    steamId,
    type,
    amount: -amount,
    balanceAfter: wallet.balance,
    refId,
    note,
    createdAt: Date.now(),
  })
  store.transactions = store.transactions.slice(0, 500)

  await writeStore(store)
  return { ok: true, balance: wallet.balance }
}

export async function getWalletTransactions(steamId: string, limit = 20): Promise<WalletTransaction[]> {
  const store = await readStore()
  return store.transactions.filter((t) => t.steamId === steamId).slice(0, limit)
}
