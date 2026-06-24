import { getUserData } from "@/lib/user-store"

export function isEmailEnabled(): boolean {
  return !!(
    process.env.RESEND_API_KEY?.trim() ||
    process.env.EMAIL_WEBHOOK_URL?.trim()
  )
}

function getEmailFrom(): string {
  return process.env.EMAIL_FROM?.trim() || "SkinApex <noreply@skinapex.net>"
}

/** Send a plain-text email when Resend or a webhook is configured. */
export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  const trimmedTo = to.trim()
  if (!trimmedTo || !isEmailEnabled()) return false

  const resendKey = process.env.RESEND_API_KEY?.trim()
  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: getEmailFrom(),
          to: trimmedTo,
          subject,
          text,
        }),
      })
      return res.ok
    } catch (err) {
      console.error("[email] Resend failed:", err)
      return false
    }
  }

  const webhook = process.env.EMAIL_WEBHOOK_URL?.trim()
  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: trimmedTo, subject, text }),
      })
      return res.ok
    } catch (err) {
      console.error("[email] Webhook failed:", err)
      return false
    }
  }

  return false
}

export async function sendUserEmail(
  steamId: string,
  subject: string,
  text: string,
): Promise<boolean> {
  const user = await getUserData(steamId)
  const email = user.email?.trim()
  if (!email) return false
  return sendEmail(email, subject, text)
}

export async function sendAdminEmail(subject: string, text: string): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL?.trim()
  if (adminEmail) {
    await sendEmail(adminEmail, subject, text)
  }
}
