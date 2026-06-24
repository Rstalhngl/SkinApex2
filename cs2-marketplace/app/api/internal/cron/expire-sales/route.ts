import { NextResponse } from "next/server"
import { getCronSecret } from "@/lib/app-config"
import { processDeliveryReminders, processExpiredSales } from "@/lib/sale-lifecycle"

/** Cron: expire stale sales + send seller delivery reminders. */
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
    const reminders = await processDeliveryReminders()
    const expired = await processExpiredSales()
    return NextResponse.json({ ok: true, expired, reminders })
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
