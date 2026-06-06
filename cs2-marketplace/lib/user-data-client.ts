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

export async function fetchWalletBalance(): Promise<number> {
  try {
    const res = await apiFetch("/api/wallet")
    if (!res.ok) return 0
    const data = await res.json()
    return typeof data.balance === "number" ? data.balance : 0
  } catch {
    return 0
  }
}

export async function walletDeposit(amount: number): Promise<number | null> {
  try {
    const res = await apiFetch("/api/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deposit", amount }),
    })
    if (!res.ok) return null
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
