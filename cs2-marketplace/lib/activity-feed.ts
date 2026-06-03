"use client"

// Global activity feed — stores the last N marketplace events
// Components can push events and subscribe to changes via a simple callback system

export type ActivityAction = "bought" | "listed" | "traded" | "escrowed" | "wishlisted" | "carted"

export interface ActivityEvent {
  id: number
  item: string
  action: ActivityAction
  price: string
  ts: number
}

const MAX_EVENTS = 30

let events: ActivityEvent[] = []
let nextId = 1
const listeners = new Set<() => void>()

export function pushActivity(item: string, action: ActivityAction, price: string) {
  events = [{ id: nextId++, item, action, price, ts: Date.now() }, ...events].slice(0, MAX_EVENTS)
  listeners.forEach((cb) => cb())
}

export function getActivity(): ActivityEvent[] {
  return events
}

export function subscribeActivity(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
