"use client"

import { apiFetch } from "@/lib/api-client"

export interface UserData {
  firstName?: string
  lastName?: string
  email?: string
  tradeUrl?: string
  cartListingIds: string[]
  wishlistListingIds: string[]
  tosAcceptedAt?: number
  tosVersion?: string
  savedIban?: string
}

export interface UserDataResponse {
  data: UserData
  profileComplete?: boolean
}

export async function fetchUserData(): Promise<UserDataResponse | null> {
  try {
    const res = await apiFetch("/api/user-data")
    if (!res.ok) return null
    return (await res.json()) as UserDataResponse
  } catch {
    return null
  }
}

export async function patchUserData(
  patch: Partial<UserData> & { tosAccepted?: boolean },
): Promise<UserData | null> {
  try {
    const res = await apiFetch("/api/user-data", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.data as UserData
  } catch {
    return null
  }
}

export interface WalletTransaction {
  id: string
  type: string
  amount: number
  balanceAfter: number
  note?: string
  createdAt: number
}

export interface WalletData {
  balance: number
  depositedBalance: number
  withdrawableBalance: number
  transactions: WalletTransaction[]
}

export async function fetchWalletBalance(): Promise<number> {
  const data = await fetchWalletData()
  return data?.balance ?? 0
}

export async function fetchWalletData(): Promise<WalletData | null> {
  try {
    const res = await apiFetch("/api/wallet")
    if (!res.ok) return null
    const data = await res.json()
    return {
      balance: typeof data.balance === "number" ? data.balance : 0,
      depositedBalance: typeof data.depositedBalance === "number" ? data.depositedBalance : 0,
      withdrawableBalance: typeof data.withdrawableBalance === "number" ? data.withdrawableBalance : 0,
      transactions: Array.isArray(data.transactions) ? data.transactions : [],
    }
  } catch {
    return null
  }
}

export async function walletDeposit(amount: number): Promise<number | "deposits_disabled" | null> {
  try {
    const res = await apiFetch("/api/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deposit", amount }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      if (data.error === "deposits_disabled") return "deposits_disabled"
      return null
    }
    const data = await res.json()
    return data.balance
  } catch {
    return null
  }
}

export type CashoutError =
  | "withdraw_disabled"
  | "profile_incomplete"
  | "invalid_amount"
  | "below_minimum"
  | "above_max_per_tx"
  | "above_daily_limit"
  | "insufficient_withdrawable"
  | "invalid_iban"
  | "name_mismatch"
  | "server_error"

export async function requestCashout(input: {
  amount: number
  iban: string
  accountHolderName: string
}): Promise<{ ok: true } | { ok: false; error: CashoutError; min?: number; max?: number }> {
  try {
    const res = await apiFetch("/api/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { ok: false, error: (data.error as CashoutError) ?? "server_error", min: data.min, max: data.max }
    }
    return { ok: true }
  } catch {
    return { ok: false, error: "server_error" }
  }
}

export type WithdrawalStatus = "pending" | "processing" | "completed" | "rejected"

export interface WithdrawalRecord {
  id: string
  amount: number
  iban: string
  status: WithdrawalStatus
  createdAt: number
  processedAt?: number
  rejectReason?: string
}

export async function fetchWithdrawals(limit = 10): Promise<WithdrawalRecord[]> {
  try {
    const res = await apiFetch("/api/withdrawals")
    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data.requests)) return []
    return data.requests.slice(0, limit).map((r: WithdrawalRecord) => ({
      id: r.id,
      amount: Number(r.amount),
      iban: String(r.iban ?? ""),
      status: r.status,
      createdAt: Number(r.createdAt),
      processedAt: r.processedAt ? Number(r.processedAt) : undefined,
      rejectReason: r.rejectReason,
    }))
  } catch {
    return []
  }
}
