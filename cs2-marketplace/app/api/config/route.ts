import { NextResponse } from "next/server"
import { isDemoDepositEnabled, isWithdrawEnabled } from "@/lib/app-config"

export async function GET() {
  return NextResponse.json({
    demoDeposits: isDemoDepositEnabled(),
    withdrawEnabled: isWithdrawEnabled(),
  })
}
