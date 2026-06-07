import { NextResponse } from "next/server"
import type { Listing } from "@/lib/listing-types"
import { itemHasFloat } from "@/lib/item-wear"
import { resolveItemType } from "@/lib/skins"
import { isSession, requireSession } from "@/lib/api-auth"
import {
  getActiveListingsFromStore,
  readListingsStore,
  writeListingsStore,
} from "@/lib/listings-store"
import { processExpiredSales } from "@/lib/sale-lifecycle"
import { userOwnsAsset } from "@/lib/steam-inventory"
import { isListingBanned } from "@/lib/moderation-store"
import { publishListingCreated, publishListingsChanged } from "@/lib/ws-publish"

const COMMISSION = 0.07

export async function GET() {
  try {
    await processExpiredSales()
    const listings = await getActiveListingsFromStore()
    return NextResponse.json({ listings })
  } catch {
    return NextResponse.json({ listings: [] })
  }
}

export async function POST(req: Request) {
  const session = await requireSession()
  if (!isSession(session)) return session

  try {
    const body = await req.json()
    const { item, priceTry } = body as {
      item?: {
        assetId?: string
        name?: string
        marketHashName?: string
        img?: string
        exterior?: string
        rarity?: string
        rarityColor?: string
        type?: string
        stattrak?: boolean
        souvenir?: boolean
        float?: number
        patternSeed?: number
        phase?: string
        hasFloat?: boolean
      }
      priceTry?: number
    }

    if (!item?.assetId || !priceTry || priceTry <= 0) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 })
    }

    if (await isListingBanned(session.steamId)) {
      return NextResponse.json({ error: "listing_banned" }, { status: 403 })
    }

    const owns = await userOwnsAsset(session.steamId, item.assetId)
    if (!owns) {
      return NextResponse.json({ error: "asset_not_owned" }, { status: 403 })
    }

    const store = await readListingsStore()
    const alreadyListed = store.listings.some(
      (l) => l.assetId === item.assetId && l.status === "active",
    )
    if (alreadyListed) {
      return NextResponse.json({ error: "already_listed" }, { status: 400 })
    }

    const net = Math.round(priceTry * (1 - COMMISSION))
    const resolvedType = resolveItemType(item.type ?? "", item.name, item.marketHashName)
    const hasFloat = item.hasFloat ?? itemHasFloat(resolvedType, item.name, item.marketHashName)
    const listing: Listing = {
      id: `listing-${store.nextId++}`,
      sellerId: session.steamId,
      sellerName: session.steamName ?? session.steamId,
      sellerAvatar: session.steamAvatar ?? undefined,
      assetId: item.assetId,
      name: item.name ?? "",
      marketHashName: item.marketHashName ?? "",
      img: item.img ?? "",
      exterior: item.exterior ?? "",
      rarity: item.rarity ?? "",
      rarityColor: item.rarityColor ?? "#b0c3d9",
      type: resolvedType,
      stattrak: !!item.stattrak,
      souvenir: !!item.souvenir,
      float: hasFloat && item.float != null ? item.float : undefined,
      patternSeed: hasFloat && item.patternSeed != null ? item.patternSeed : undefined,
      phase: hasFloat ? item.phase : undefined,
      priceTry,
      commissionRate: COMMISSION,
      netToSeller: net,
      status: "active",
      listedAt: Date.now(),
    }

    store.listings = [listing, ...store.listings]
    await writeListingsStore(store)

    publishListingCreated({
      listingId: listing.id,
      itemName: listing.name,
      priceTry: listing.priceTry,
      sellerId: listing.sellerId,
    })

    return NextResponse.json({ listing })
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const session = await requireSession()
  if (!isSession(session)) return session

  try {
    const body = await req.json()
    const { listingId, priceTry } = body as { listingId?: string; priceTry?: number }

    if (!listingId || !priceTry || priceTry <= 0) {
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

    const net = Math.round(priceTry * (1 - COMMISSION))
    store.listings[idx] = { ...listing, priceTry, netToSeller: net }
    await writeListingsStore(store)

    publishListingsChanged()

    return NextResponse.json({ listing: store.listings[idx] })
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
