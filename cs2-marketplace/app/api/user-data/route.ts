import { NextResponse } from "next/server"
import { isSession, requireSession } from "@/lib/api-auth"
import { CURRENT_TOS_VERSION } from "@/lib/app-config"
import { normalizeIban } from "@/lib/iban"
import { isProfileComplete, isValidEmail } from "@/lib/profile-gate"
import { getUserData, updateUserData } from "@/lib/user-store"
import { isValidTradeUrl, tradeUrlMatchesSteamId } from "@/lib/trade-url"

export async function GET() {
  const session = await requireSession()
  if (!isSession(session)) return session

  const data = await getUserData(session.steamId)
  return NextResponse.json({
    data,
    profileComplete: isProfileComplete(data),
    tosVersion: CURRENT_TOS_VERSION,
  })
}

export async function PATCH(req: Request) {
  const session = await requireSession()
  if (!isSession(session)) return session

  try {
    const body = await req.json()
    const {
      tradeUrl,
      cartListingIds,
      wishlistListingIds,
      firstName,
      lastName,
      email,
      tosAccepted,
      savedIban,
    } = body as {
      tradeUrl?: string
      cartListingIds?: string[]
      wishlistListingIds?: string[]
      firstName?: string
      lastName?: string
      email?: string
      tosAccepted?: boolean
      savedIban?: string
    }

    const patch: Parameters<typeof updateUserData>[1] = {}

    if (tradeUrl !== undefined) {
      if (tradeUrl && !isValidTradeUrl(tradeUrl)) {
        return NextResponse.json({ error: "invalid_trade_url" }, { status: 400 })
      }
      if (tradeUrl && !tradeUrlMatchesSteamId(tradeUrl, session.steamId)) {
        return NextResponse.json({ error: "trade_url_mismatch" }, { status: 400 })
      }
      patch.tradeUrl = tradeUrl.trim()
    }
    if (Array.isArray(cartListingIds)) {
      patch.cartListingIds = cartListingIds.filter((id) => typeof id === "string")
    }
    if (Array.isArray(wishlistListingIds)) {
      patch.wishlistListingIds = wishlistListingIds.filter((id) => typeof id === "string")
    }
    if (firstName !== undefined) patch.firstName = firstName.trim()
    if (lastName !== undefined) patch.lastName = lastName.trim()
    if (email !== undefined) {
      const trimmed = email.trim()
      if (!isValidEmail(trimmed)) {
        return NextResponse.json({ error: "invalid_email" }, { status: 400 })
      }
      patch.email = trimmed
    }
    if (savedIban !== undefined) {
      patch.savedIban = savedIban ? normalizeIban(savedIban) : undefined
    }
    if (tosAccepted === true) {
      patch.tosAcceptedAt = Date.now()
      patch.tosVersion = CURRENT_TOS_VERSION
    }

    const data = await updateUserData(session.steamId, patch)
    return NextResponse.json({
      data,
      profileComplete: isProfileComplete(data),
      tosVersion: CURRENT_TOS_VERSION,
    })
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
