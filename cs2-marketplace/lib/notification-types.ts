export type UserNotificationType = "item_sold" | "delivery_reminder" | "offer_received" | "offer_accepted" | "offer_rejected"

export interface UserNotification {
  id: string
  steamId: string
  type: UserNotificationType
  message: string
  saleId?: string
  listingId?: string
  createdAt: number
  read: boolean
}

export interface NotificationsStore {
  notifications: UserNotification[]
  nextId: number
}
