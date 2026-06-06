import { NextResponse } from "next/server"
import type { Listing } from "@/lib/listing-types"
import {
  getActiveListingsFromStore,
  readListingsStore,
  writeListingsStore,
} from "@/lib/listings-store"

const COMMISSION = 0.07

export async function GET() {
  try {
    const listings = await getActiveListingsFromStore()
    return NextResponse.json({ listings })
  } catch {
    return NextResponse.json({ listings: [] })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      item,
      priceTry,
      seller,
    } = body as {
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
      }
      priceTry?: number
      seller?: {
        steamId?: string
        steamName?: string | null
        steamAvatar?: string | null
      }
    }

    if (!item?.assetId || !seller?.steamId || !priceTry || priceTry <= 0) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 })
    }

    const store = await readListingsStore()
    const net = Math.round(priceTry * (1 - COMMISSION))
    const listing: Listing = {
      id: `listing-${store.nextId++}`,
      sellerId: seller.steamId,
      sellerName: seller.steamName ?? seller.steamId,
      sellerAvatar: seller.steamAvatar ?? undefined,
      assetId: item.assetId,
      name: item.name ?? "",
      marketHashName: item.marketHashName ?? "",
      img: item.img ?? "",
      exterior: item.exterior ?? "",
      rarity: item.rarity ?? "",
      rarityColor: item.rarityColor ?? "#b0c3d9",
      type: item.type ?? "",
      stattrak: !!item.stattrak,
      souvenir: !!item.souvenir,
      priceTry,
      commissionRate: COMMISSION,
      netToSeller: net,
      status: "active",
      listedAt: Date.now(),
    }

    store.listings = [listing, ...store.listings]
    await writeListingsStore(store)

    return NextResponse.json({ listing })
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
