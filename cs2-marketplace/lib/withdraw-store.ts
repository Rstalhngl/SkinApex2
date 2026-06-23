import { promises as fs } from "fs"
import path from "path"
import { withStoreLock } from "@/lib/data-lock"
import { bumpCounter, isDbEnabled, query } from "@/lib/db"

const DATA_DIR = path.join(process.cwd(), "data")
const DATA_PATH = path.join(DATA_DIR, "withdrawals.json")

export type WithdrawalStatus = "pending" | "processing" | "completed" | "rejected"

export interface WithdrawalRequest {
  id: string
  steamId: string
  amount: number
  iban: string
  accountHolderName: string
  status: WithdrawalStatus
  createdAt: number
  processedAt?: number
  rejectReason?: string
}

interface WithdrawalsStore {
  requests: WithdrawalRequest[]
}

const EMPTY: WithdrawalsStore = { requests: [] }

async function readStoreJson(): Promise<WithdrawalsStore> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8")
    const parsed = JSON.parse(raw) as WithdrawalsStore
    return { requests: Array.isArray(parsed.requests) ? parsed.requests : [] }
  } catch {
    return { ...EMPTY }
  }
}

async function writeStoreJson(store: WithdrawalsStore): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf-8")
}

export async function createWithdrawalRequest(
  req: Omit<WithdrawalRequest, "id" | "status" | "createdAt">,
): Promise<WithdrawalRequest> {
  const createdAt = Date.now()

  if (isDbEnabled()) {
    const num = await bumpCounter("withdrawal_id")
    const id = `wd-${num}`
    await query(
      `INSERT INTO withdrawal_requests
        (id, steam_id, amount, iban, account_holder_name, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6)`,
      [id, req.steamId, req.amount, req.iban, req.accountHolderName, createdAt],
    )
    return { id, ...req, status: "pending", createdAt }
  }

  return withStoreLock("withdrawals", async () => {
    const store = await readStoreJson()
    const num = store.requests.length + 1
    const id = `wd-${num}`
    const entry: WithdrawalRequest = { id, ...req, status: "pending", createdAt }
    store.requests.unshift(entry)
    await writeStoreJson(store)
    return entry
  })
}

export async function getWithdrawalsForUser(
  steamId: string,
  limit = 20,
): Promise<WithdrawalRequest[]> {
  if (isDbEnabled()) {
    const res = await query<{
      id: string
      steam_id: string
      amount: string
      iban: string
      account_holder_name: string
      status: WithdrawalStatus
      created_at: string
      processed_at: string | null
      reject_reason: string | null
    }>(
      `SELECT id, steam_id, amount, iban, account_holder_name, status, created_at, processed_at, reject_reason
       FROM withdrawal_requests WHERE steam_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [steamId, limit],
    )
    return res.rows.map((r) => ({
      id: r.id,
      steamId: r.steam_id,
      amount: Number(r.amount),
      iban: r.iban,
      accountHolderName: r.account_holder_name,
      status: r.status,
      createdAt: Number(r.created_at),
      processedAt: r.processed_at ? Number(r.processed_at) : undefined,
      rejectReason: r.reject_reason ?? undefined,
    }))
  }

  const store = await readStoreJson()
  return store.requests.filter((r) => r.steamId === steamId).slice(0, limit)
}

export async function getDailyWithdrawnTotal(
  steamId: string,
  dayStartMs: number,
): Promise<number> {
  if (isDbEnabled()) {
    const res = await query<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM withdrawal_requests
       WHERE steam_id = $1 AND created_at >= $2
       AND status IN ('pending', 'processing', 'completed')`,
      [steamId, dayStartMs],
    )
    return Number(res.rows[0]?.total ?? 0)
  }

  const store = await readStoreJson()
  return store.requests
    .filter(
      (r) =>
        r.steamId === steamId &&
        r.createdAt >= dayStartMs &&
        r.status !== "rejected",
    )
    .reduce((sum, r) => sum + r.amount, 0)
}
