import { NextResponse } from "next/server"
import { getCronSecret } from "@/lib/app-config"
import { processExpiredSales } from "@/lib/sale-lifecycle"

export async function POST(req: Request) {
  const secret = getCronSecret()
  if (!secret) {
    return NextResponse.json({ error: "cron_not_configured" }, { status: 503 })
  }

  const header = req.headers.get("x-cron-secret")?.trim()
  if (header !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    await processExpiredSales()
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
