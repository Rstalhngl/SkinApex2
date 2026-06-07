import type { WsBroadcastMessage, WsChannel, WsActivityPayload } from "@/lib/ws-types"

function getWsInternalUrl(): string | null {
  const port = process.env.WS_PORT?.trim() || "3001"
  const host = process.env.WS_INTERNAL_HOST?.trim() || "127.0.0.1"
  return `http://${host}:${port}/internal/broadcast`
}

function getWsApiKey(): string | null {
  return process.env.WS_API_KEY?.trim() || null
}

/** Fire-and-forget broadcast to the WebSocket server. */
export async function publishWs(message: Omit<WsBroadcastMessage, "ts">): Promise<void> {
  const url = getWsInternalUrl()
  const key = getWsApiKey()
  if (!url || !key) return

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ws-key": key,
      },
      body: JSON.stringify({ ...message, ts: Date.now() }),
      signal: AbortSignal.timeout(3000),
    })
  } catch {
    // WS server may be offline — polling fallback handles sync
  }
}

export function publishListingsChanged(): void {
  void publishWs({ channel: "listings" })
}

export function publishActivityEvent(payload: WsActivityPayload): void {
  void publishWs({ channel: "activity", payload })
}

export function publishUserChannel(channel: WsChannel, steamId: string): void {
  void publishWs({ channel, steamId })
}

export function publishPurchaseEvents(opts: {
  buyerId: string
  sellerId: string
  itemName: string
  priceTry: number
  saleId: string
  listingId: string
}): void {
  const price = new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(Math.round(opts.priceTry))

  publishListingsChanged()
  publishActivityEvent({
    id: `sale-${opts.saleId}`,
    item: opts.itemName,
    action: "bought",
    price,
    ts: Date.now(),
  })
  publishUserChannel("sales", opts.buyerId)
  publishUserChannel("sales", opts.sellerId)
  publishUserChannel("wallet", opts.buyerId)
}

export function publishListingCreated(opts: {
  listingId: string
  itemName: string
  priceTry: number
  sellerId: string
}): void {
  const price = new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(Math.round(opts.priceTry))

  publishListingsChanged()
  publishActivityEvent({
    id: `listing-${opts.listingId}`,
    item: opts.itemName,
    action: "listed",
    price,
    ts: Date.now(),
  })
  publishUserChannel("offers", opts.sellerId)
}
