import { NextResponse } from "next/server"
import {
  getWithdrawMaxDailyTry,
  getWithdrawMaxPerTxTry,
  getWithdrawMinTry,
  isDemoDepositEnabled,
  isWithdrawEnabled,
} from "@/lib/app-config"

export async function GET() {
  return NextResponse.json({
    demoDeposits: isDemoDepositEnabled(),
    withdrawEnabled: isWithdrawEnabled(),
    withdrawMin: getWithdrawMinTry(),
    withdrawMaxPerTx: getWithdrawMaxPerTxTry(),
    withdrawMaxDaily: getWithdrawMaxDailyTry(),
  })
}
