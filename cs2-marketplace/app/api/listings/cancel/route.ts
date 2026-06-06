import { NextResponse } from "next/server"
import { readListingsStore, writeListingsStore } from "@/lib/listings-store"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { listingId, sellerId } = body as {
      listingId?: string
      sellerId?: string
    }

    if (!listingId || !sellerId) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 })
    }

    const store = await readListingsStore()
    const idx = store.listings.findIndex(
      (l) => l.id === listingId && l.status === "active",
    )
    if (idx === -1) {
      return NextResponse.json({ error: "listing_not_found" }, { status: 404 })
    }

    const listing = store.listings[idx]
    if (listing.sellerId !== sellerId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }

    store.listings[idx] = { ...listing, status: "cancelled" }
    await writeListingsStore(store)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
