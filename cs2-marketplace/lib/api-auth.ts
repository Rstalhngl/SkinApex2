import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { SESSION_COOKIE, verifySession, type SessionPayload } from "@/lib/session"

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySession(token)
}

export async function requireSession(): Promise<SessionPayload | NextResponse> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  return session
}

export function isSession(res: SessionPayload | NextResponse): res is SessionPayload {
  return !(res instanceof NextResponse)
}
