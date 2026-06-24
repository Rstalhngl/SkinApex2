import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { getPendingDeliverySales } from "@/lib/admin-service"

export async function GET() {
  const admin = await requireAdmin()
  if (admin instanceof Response) return admin

  const sales = await getPendingDeliverySales()
  return NextResponse.json({ sales })
}
