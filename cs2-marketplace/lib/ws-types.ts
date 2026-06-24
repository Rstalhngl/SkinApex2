export type WsChannel =
  | "listings"
  | "sales"
  | "notifications"
  | "offers"
  | "wallet"
  | "activity"

export interface WsActivityPayload {
  id: string
  item: string
  action: "bought" | "listed"
  price: string
  ts: number
}

export interface WsBroadcastMessage {
  channel: WsChannel
  /** When set, only clients authenticated with this Steam ID receive the event. */
  steamId?: string
  payload?: WsActivityPayload | Record<string, unknown>
  ts: number
}
