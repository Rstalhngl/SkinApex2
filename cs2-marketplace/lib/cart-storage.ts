import type { Skin } from "@/lib/skins"

const CART_PREFIX = "skx_cart_v2_"

function cartKey(steamId: string): string {
  return `${CART_PREFIX}${steamId}`
}

export function loadCartFromStorage(steamId: string): Skin[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(cartKey(steamId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as Skin[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((skin) => typeof skin?.listingId === "string")
  } catch {
    return []
  }
}

export function saveCartToStorage(steamId: string, cart: Skin[]): void {
  if (typeof window === "undefined") return
  try {
    if (cart.length === 0) {
      localStorage.removeItem(cartKey(steamId))
      return
    }
    localStorage.setItem(cartKey(steamId), JSON.stringify(cart))
  } catch {
    // ignore quota / private mode
  }
}

export function clearCartStorage(steamId?: string): void {
  if (typeof window === "undefined" || !steamId) return
  try {
    localStorage.removeItem(cartKey(steamId))
  } catch {
    // ignore
  }
}
