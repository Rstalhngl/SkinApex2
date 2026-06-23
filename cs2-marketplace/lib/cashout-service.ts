import {
  getWithdrawMaxDailyTry,
  getWithdrawMaxPerTxTry,
  getWithdrawMinTry,
  isWithdrawEnabled,
} from "@/lib/app-config"
import { isValidTurkishIban, maskIban, namesMatch, normalizeIban } from "@/lib/iban"
import { isProfileComplete } from "@/lib/profile-gate"
import { getUserData } from "@/lib/user-store"
import {
  debitWithdrawableBalance,
  creditWallet,
  getWalletBalances,
} from "@/lib/wallet-store"
import { createWithdrawalRequest, getDailyWithdrawnTotal } from "@/lib/withdraw-store"

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

export interface CashoutRequestInput {
  steamId: string
  amount: number
  iban: string
  accountHolderName: string
}

export type CashoutResult =
  | { ok: true; requestId: string; maskedIban: string }
  | { ok: false; error: CashoutError; min?: number; max?: number; dailyRemaining?: number }

function startOfUtcDayMs(now = Date.now()): number {
  const d = new Date(now)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

export async function requestCashout(input: CashoutRequestInput): Promise<CashoutResult> {
  if (!isWithdrawEnabled()) return { ok: false, error: "withdraw_disabled" }

  const profile = await getUserData(input.steamId)
  if (!isProfileComplete(profile)) return { ok: false, error: "profile_incomplete" }

  const amount = Math.round(input.amount * 100) / 100
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "invalid_amount" }

  const min = getWithdrawMinTry()
  const maxPerTx = getWithdrawMaxPerTxTry()
  const maxDaily = getWithdrawMaxDailyTry()

  if (amount < min) return { ok: false, error: "below_minimum", min }
  if (amount > maxPerTx) return { ok: false, error: "above_max_per_tx", max: maxPerTx }

  const dailyTotal = await getDailyWithdrawnTotal(input.steamId, startOfUtcDayMs())
  if (dailyTotal + amount > maxDaily) {
    return {
      ok: false,
      error: "above_daily_limit",
      max: maxDaily,
      dailyRemaining: Math.max(0, maxDaily - dailyTotal),
    }
  }

  const iban = normalizeIban(input.iban)
  if (!isValidTurkishIban(iban)) return { ok: false, error: "invalid_iban" }

  if (
    !namesMatch(
      profile.firstName!,
      profile.lastName!,
      input.accountHolderName.trim(),
    )
  ) {
    return { ok: false, error: "name_mismatch" }
  }

  const balances = await getWalletBalances(input.steamId)
  if (balances.withdrawable < amount) {
    return { ok: false, error: "insufficient_withdrawable" }
  }

  const debit = await debitWithdrawableBalance(
    input.steamId,
    amount,
    "withdraw",
    undefined,
    `IBAN ${maskIban(iban)}`,
  )
  if (!debit.ok) {
    if (debit.error === "insufficient_withdrawable") {
      return { ok: false, error: "insufficient_withdrawable" }
    }
    return { ok: false, error: "server_error" }
  }

  try {
    const request = await createWithdrawalRequest({
      steamId: input.steamId,
      amount,
      iban,
      accountHolderName: input.accountHolderName.trim(),
    })
    return { ok: true, requestId: request.id, maskedIban: maskIban(iban) }
  } catch {
    await creditWallet(input.steamId, amount, "sale_payout", undefined, "Çekim talebi oluşturulamadı — iade")
    return { ok: false, error: "server_error" }
  }
}
