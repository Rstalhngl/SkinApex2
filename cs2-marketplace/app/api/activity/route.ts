import { NextResponse } from "next/server"
import { readListingsStore } from "@/lib/listings-store"
import { readSalesStore } from "@/lib/sales-store"

function fmtTry(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(Math.round(value))
}

export async function GET() {
  try {
    const [listingsStore, salesStore] = await Promise.all([
      readListingsStore(),
      readSalesStore(),
    ])

    const listed = listingsStore.listings
      .filter((l) => l.status === "active")
      .map((l) => ({
        id: `listing-${l.id}`,
        item: l.name,
        action: "listed" as const,
        price: fmtTry(l.priceTry),
        ts: l.listedAt,
      }))

    const bought = salesStore.sales.map((s) => ({
      id: `sale-${s.id}`,
      item: s.itemName,
      action: "bought" as const,
      price: fmtTry(s.priceTry),
      ts: s.soldAt,
    }))

    const events = [...listed, ...bought]
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 30)

    return NextResponse.json({ events })
  } catch {
    return NextResponse.json({ events: [] })
  }
}
