import { NextResponse } from "next/server"
import {
  getWithdrawMaxDailyTry,
  getWithdrawMaxPerTxTry,
  getWithdrawMinTry,
  isDemoDepositEnabled,
  isWithdrawEnabled,
} from "@/lib/app-config"
import { isTradeBotEnabled } from "@/lib/trade-bot-config"

export async function GET() {
  return NextResponse.json({
    demoDeposits: isDemoDepositEnabled(),
    withdrawEnabled: isWithdrawEnabled(),
    withdrawMin: getWithdrawMinTry(),
    withdrawMaxPerTx: getWithdrawMaxPerTxTry(),
    withdrawMaxDaily: getWithdrawMaxDailyTry(),
    tradeBotEnabled: isTradeBotEnabled(),
  })
}
