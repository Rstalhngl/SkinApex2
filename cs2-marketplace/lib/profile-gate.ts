import { NextResponse } from "next/server"
import { getUserData, type UserData } from "@/lib/user-store"
import { CURRENT_TOS_VERSION } from "@/lib/app-config"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim())
}

export function isProfileComplete(data: UserData): boolean {
  return Boolean(
    data.firstName?.trim() &&
      data.lastName?.trim() &&
      data.email?.trim() &&
      isValidEmail(data.email) &&
      data.tosAcceptedAt &&
      data.tosVersion === CURRENT_TOS_VERSION,
  )
}

export function profileIncompleteResponse(): NextResponse {
  return NextResponse.json(
    {
      error: "profile_incomplete",
      message: "Ad, soyad, e-posta ve kullanıcı sözleşmesi onayı gereklidir.",
      required: ["firstName", "lastName", "email", "tosAccepted"],
    },
    { status: 403 },
  )
}

export async function requireCompleteProfile(
  steamId: string,
): Promise<UserData | NextResponse> {
  const data = await getUserData(steamId)
  if (!isProfileComplete(data)) return profileIncompleteResponse()
  return data
}
