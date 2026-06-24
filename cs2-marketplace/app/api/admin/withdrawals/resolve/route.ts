import { NextResponse } from "next/server"
import { isSession } from "@/lib/api-auth"
import { requireAdmin } from "@/lib/admin-auth"
import { resolveWithdrawal, type WithdrawResolveAction } from "@/lib/admin-service"

const ACTIONS: WithdrawResolveAction[] = ["processing", "complete", "reject"]

export async function POST(req: Request) {
  const session = await requireAdmin()
  if (!isSession(session)) return session

  try {
    const body = await req.json()
    const { requestId, action, rejectReason } = body as {
      requestId?: string
      action?: WithdrawResolveAction
      rejectReason?: string
    }

    if (!requestId || !action || !ACTIONS.includes(action)) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 })
    }

    const updated = await resolveWithdrawal(requestId, action, session.steamId, rejectReason)
    if (!updated) {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }

    return NextResponse.json({ request: updated })
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
