import { NextResponse } from "next/server"
import { getProductionChecklist } from "@/lib/app-config"
import { isDbEnabled } from "@/lib/db"

export async function GET() {
  const checks = getProductionChecklist()
  const ok = checks.every((c) => c.status !== "missing")

  return NextResponse.json(
    {
      ok,
      env: process.env.NODE_ENV ?? "development",
      database: isDbEnabled() ? "postgres" : "json",
      checks,
    },
    { status: ok ? 200 : 503 },
  )
}
