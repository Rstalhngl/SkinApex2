import { NextResponse } from "next/server"
import { isSession } from "@/lib/api-auth"
import { requireAdmin } from "@/lib/admin-auth"
import { getDisputedSales } from "@/lib/sales-store"

export async function GET() {
  const session = await requireAdmin()
  if (!isSession(session)) return session

  try {
    const disputes = await getDisputedSales()
    return NextResponse.json({ disputes })
  } catch {
    return NextResponse.json({ disputes: [] })
  }
}
