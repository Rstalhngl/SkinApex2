import { NextResponse } from "next/server"
import { getSession, isSession, requireSession } from "@/lib/api-auth"
import {
  getWalletBalances,
  getWalletTransactions,
} from "@/lib/wallet-store"
import { isDemoDepositEnabled, isWithdrawEnabled } from "@/lib/app-config"
import { creditWallet } from "@/lib/wallet-store"
import { publishUserChannel } from "@/lib/ws-publish"

export async function GET() {
  const session = await requireSession()
  if (!isSession(session)) return session

  const [balances, transactions] = await Promise.all([
    getWalletBalances(session.steamId),
    getWalletTransactions(session.steamId),
  ])

  return NextResponse.json({
    balance: balances.balance,
    depositedBalance: balances.deposited,
    withdrawableBalance: balances.withdrawable,
    transactions,
  })
}

export async function POST(req: Request) {
  const session = await requireSession()
  if (!isSession(session)) return session

  try {
    const body = await req.json()
    const { action, amount } = body as { action?: string; amount?: number }

    if (!action || !amount || amount <= 0) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 })
    }

    if (action === "deposit") {
      if (!isDemoDepositEnabled()) {
        return NextResponse.json({ error: "deposits_disabled" }, { status: 403 })
      }
      const result = await creditWallet(session.steamId, amount, "deposit")
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
      publishUserChannel("wallet", session.steamId)
      const balances = await getWalletBalances(session.steamId)
      return NextResponse.json({
        balance: balances.balance,
        depositedBalance: balances.deposited,
        withdrawableBalance: balances.withdrawable,
      })
    }

    if (action === "withdraw") {
      return NextResponse.json(
        {
          error: "use_withdrawals_api",
          message: "Nakit çekim için POST /api/withdrawals kullanın.",
          withdrawEnabled: isWithdrawEnabled(),
        },
        { status: 400 },
      )
    }

    return NextResponse.json({ error: "unknown_action" }, { status: 400 })
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
