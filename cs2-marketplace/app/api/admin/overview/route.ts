import { NextResponse } from "next/server"
import { isSession } from "@/lib/api-auth"
import { requireAdmin } from "@/lib/admin-auth"
import { getAdminOverview } from "@/lib/admin-service"

export async function GET() {
  const session = await requireAdmin()
  if (!isSession(session)) return session

  try {
    const overview = await getAdminOverview()
    return NextResponse.json({ overview })
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
