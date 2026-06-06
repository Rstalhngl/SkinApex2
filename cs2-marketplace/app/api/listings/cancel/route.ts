import { NextResponse } from "next/server"
import { isSession, requireSession } from "@/lib/api-auth"
import { readListingsStore, writeListingsStore } from "@/lib/listings-store"

export async function POST(req: Request) {
  const session = await requireSession()
  if (!isSession(session)) return session

  try {
    const body = await req.json()
    const { listingId } = body as { listingId?: string }

    if (!listingId) {
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
    if (listing.sellerId !== session.steamId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }

    store.listings[idx] = { ...listing, status: "cancelled" }
    await writeListingsStore(store)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
