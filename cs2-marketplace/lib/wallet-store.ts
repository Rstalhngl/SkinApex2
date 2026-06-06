import { promises as fs } from "fs"
import path from "path"
import { withStoreLock } from "@/lib/data-lock"
import { bumpCounter, isDbEnabled, query } from "@/lib/db"

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

async function readStoreJsonUnsafe(): Promise<WalletStore> {
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

async function readStoreJson(): Promise<WalletStore> {
  return withStoreLock("wallets", readStoreJsonUnsafe)
}

async function writeStoreJson(store: WalletStore): Promise<void> {
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

async function ensureWalletPg(steamId: string): Promise<void> {
  await query(
    `INSERT INTO wallets (steam_id, balance) VALUES ($1, 0) ON CONFLICT DO NOTHING`,
    [steamId],
  )
}

async function getWalletBalancePg(steamId: string): Promise<number> {
  await ensureWalletPg(steamId)
  const res = await query<{ balance: string }>(
    "SELECT balance FROM wallets WHERE steam_id = $1",
    [steamId],
  )
  return Number(res.rows[0]?.balance ?? 0)
}

async function insertTxPg(
  steamId: string,
  type: WalletTxType,
  amount: number,
  balanceAfter: number,
  refId?: string,
  note?: string,
): Promise<void> {
  const num = await bumpCounter("wallet_tx_id")
  await query(
    `INSERT INTO wallet_transactions
      (id, steam_id, type, amount, balance_after, ref_id, note, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [`tx-${num}`, steamId, type, amount, balanceAfter, refId ?? null, note ?? null, Date.now()],
  )
}

export async function getWalletBalance(steamId: string): Promise<number> {
  if (isDbEnabled()) return getWalletBalancePg(steamId)
  const store = await readStoreJson()
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

  if (isDbEnabled()) {
    await ensureWalletPg(steamId)
    const res = await query<{ balance: string }>(
      `UPDATE wallets SET balance = ROUND(balance + $2, 2)
       WHERE steam_id = $1 RETURNING balance`,
      [steamId, amount],
    )
    const balance = Number(res.rows[0]?.balance ?? 0)
    await insertTxPg(steamId, type, amount, balance, refId, note)
    return { ok: true, balance }
  }

  const store = await readStoreJson()
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
  await writeStoreJson(store)
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

  if (isDbEnabled()) {
    await ensureWalletPg(steamId)
    const current = await getWalletBalancePg(steamId)
    if (current < amount) return { ok: false, error: "insufficient_balance" }
    const res = await query<{ balance: string }>(
      `UPDATE wallets SET balance = ROUND(balance - $2, 2)
       WHERE steam_id = $1 AND balance >= $2 RETURNING balance`,
      [steamId, amount],
    )
    if (!res.rows[0]) return { ok: false, error: "insufficient_balance" }
    const balance = Number(res.rows[0].balance)
    await insertTxPg(steamId, type, -amount, balance, refId, note)
    return { ok: true, balance }
  }

  const store = await readStoreJson()
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
  await writeStoreJson(store)
  return { ok: true, balance: wallet.balance }
}

export async function getWalletTransactions(steamId: string, limit = 20): Promise<WalletTransaction[]> {
  if (isDbEnabled()) {
    const res = await query<{
      id: string
      steam_id: string
      type: WalletTxType
      amount: string
      balance_after: string
      ref_id: string | null
      note: string | null
      created_at: string
    }>(
      `SELECT id, steam_id, type, amount, balance_after, ref_id, note, created_at
       FROM wallet_transactions WHERE steam_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [steamId, limit],
    )
    return res.rows.map((r) => ({
      id: r.id,
      steamId: r.steam_id,
      type: r.type,
      amount: Number(r.amount),
      balanceAfter: Number(r.balance_after),
      refId: r.ref_id ?? undefined,
      note: r.note ?? undefined,
      createdAt: Number(r.created_at),
    }))
  }
  const store = await readStoreJson()
  return store.transactions.filter((t) => t.steamId === steamId).slice(0, limit)
}
