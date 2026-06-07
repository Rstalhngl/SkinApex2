"use client"

import { apiFetch } from "@/lib/api-client"

export interface UserData {
  tradeUrl?: string
  cartListingIds: string[]
  wishlistListingIds: string[]
}

export async function fetchUserData(): Promise<UserData | null> {
  try {
    const res = await apiFetch("/api/user-data")
    if (!res.ok) return null
    const data = await res.json()
    return data.data as UserData
  } catch {
    return null
  }
}

export async function patchUserData(patch: Partial<UserData>): Promise<UserData | null> {
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

export async function fetchWalletBalance(): Promise<number> {
  const data = await fetchWalletData()
  return data?.balance ?? 0
}

export async function fetchWalletData(): Promise<{ balance: number; transactions: WalletTransaction[] } | null> {
  try {
    const res = await apiFetch("/api/wallet")
    if (!res.ok) return null
    const data = await res.json()
    return {
      balance: typeof data.balance === "number" ? data.balance : 0,
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

export async function walletWithdraw(amount: number): Promise<number | null> {
  try {
    const res = await apiFetch("/api/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "withdraw", amount }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.balance
  } catch {
    return null
  }
}
