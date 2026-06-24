import { NextResponse } from "next/server"
import { isSession } from "@/lib/api-auth"
import { requireAdmin } from "@/lib/admin-auth"
import { getWithdrawalsForAdmin } from "@/lib/withdraw-store"

export async function GET(req: Request) {
  const session = await requireAdmin()
  if (!isSession(session)) return session

  try {
    const url = new URL(req.url)
    const all = url.searchParams.get("all") === "1"
    const requests = await getWithdrawalsForAdmin({ openOnly: !all, limit: all ? 100 : 50 })
    return NextResponse.json({ requests })
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
