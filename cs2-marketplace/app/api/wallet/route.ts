import { NextResponse } from "next/server"
import { getSession, isSession, requireSession } from "@/lib/api-auth"
import {
  creditWallet,
  debitWallet,
  getWalletBalance,
  getWalletTransactions,
} from "@/lib/wallet-store"
import { publishUserChannel } from "@/lib/ws-publish"

export async function GET() {
  const session = await requireSession()
  if (!isSession(session)) return session

  const [balance, transactions] = await Promise.all([
    getWalletBalance(session.steamId),
    getWalletTransactions(session.steamId),
  ])

  return NextResponse.json({ balance, transactions })
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
      const result = await creditWallet(session.steamId, amount, "deposit")
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
      publishUserChannel("wallet", session.steamId)
      return NextResponse.json({ balance: result.balance })
    }

    if (action === "withdraw") {
      if (amount < 500) {
        return NextResponse.json({ error: "min_withdraw_500" }, { status: 400 })
      }
      const result = await debitWallet(session.steamId, amount, "withdraw")
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
      publishUserChannel("wallet", session.steamId)
      return NextResponse.json({ balance: result.balance })
    }

    return NextResponse.json({ error: "unknown_action" }, { status: 400 })
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
