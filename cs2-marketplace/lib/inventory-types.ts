/**
 * Shared InventoryItem type — used by both client components and the API route.
 * Keeping it here prevents importing from app/api/... in client components,
 * which causes Next.js server/client boundary errors.
 */
export interface InventoryItem {
  assetId: string
  name: string
  marketHashName: string
  tradable: boolean
  marketable: boolean
  img: string
  exterior: string
  rarity: string
  rarityColor: string
  type: string
  stattrak: boolean
  souvenir: boolean
  float?: number
  patternSeed?: number
  phase?: string
  hasFloat?: boolean
}
