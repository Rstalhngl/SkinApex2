import { NextResponse } from "next/server"
import { getSession, isSession, requireSession } from "@/lib/api-auth"
import type { SessionPayload } from "@/lib/session"

export function getAdminSteamIds(): string[] {
  const raw = process.env.ADMIN_STEAM_IDS ?? ""
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
}

export function isAdminSteamId(steamId: string): boolean {
  const admins = getAdminSteamIds()
  if (admins.length === 0) return false
  return admins.includes(steamId)
}

export async function requireAdmin(): Promise<SessionPayload | NextResponse> {
  const session = await requireSession()
  if (!isSession(session)) return session

  if (!isAdminSteamId(session.steamId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  return session
}

export async function getAdminSession(): Promise<SessionPayload | null> {
  const session = await getSession()
  if (!session || !isAdminSteamId(session.steamId)) return null
  return session
}
