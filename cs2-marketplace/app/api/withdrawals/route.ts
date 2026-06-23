import { NextResponse } from "next/server"
import { isSession, requireSession } from "@/lib/api-auth"
import { requestCashout } from "@/lib/cashout-service"
import {
  getWithdrawMaxDailyTry,
  getWithdrawMaxPerTxTry,
  getWithdrawMinTry,
  isWithdrawEnabled,
} from "@/lib/app-config"
import { profileIncompleteResponse } from "@/lib/profile-gate"
import { getWithdrawalsForUser } from "@/lib/withdraw-store"
import { publishUserChannel } from "@/lib/ws-publish"

export async function GET() {
  const session = await requireSession()
  if (!isSession(session)) return session

  const requests = await getWithdrawalsForUser(session.steamId)
  return NextResponse.json({ requests })
}

export async function POST(req: Request) {
  const session = await requireSession()
  if (!isSession(session)) return session

  if (!isWithdrawEnabled()) {
    return NextResponse.json({ error: "withdraw_disabled" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { amount, iban, accountHolderName } = body as {
      amount?: number
      iban?: string
      accountHolderName?: string
    }

    if (!amount || !iban || !accountHolderName?.trim()) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 })
    }

    const result = await requestCashout({
      steamId: session.steamId,
      amount,
      iban,
      accountHolderName,
    })

    if (!result.ok) {
      const status =
        result.error === "profile_incomplete"
          ? 403
          : result.error === "withdraw_disabled"
            ? 403
            : 400
      if (result.error === "profile_incomplete") return profileIncompleteResponse()
      return NextResponse.json(
        {
          error: result.error,
          min: result.min,
          max: result.max,
          dailyRemaining: result.dailyRemaining,
        },
        { status },
      )
    }

    publishUserChannel("wallet", session.steamId)
    return NextResponse.json({
      ok: true,
      requestId: result.requestId,
      maskedIban: result.maskedIban,
    })
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}

export async function OPTIONS() {
  return NextResponse.json({
    enabled: isWithdrawEnabled(),
    min: getWithdrawMinTry(),
    maxPerTx: getWithdrawMaxPerTxTry(),
    maxDaily: getWithdrawMaxDailyTry(),
  })
}
