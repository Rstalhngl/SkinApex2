"use client"

import { useEffect, useState } from "react"
import { Analytics } from "@vercel/analytics/next"
import { getCookieConsent } from "@/components/cookie-banner"

export function AnalyticsLoader() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const sync = () => {
      const consent = getCookieConsent()
      setEnabled(Boolean(consent?.analytics))
    }
    sync()
    window.addEventListener("storage", sync)
    window.addEventListener("skx-cookie-consent", sync)
    return () => {
      window.removeEventListener("storage", sync)
      window.removeEventListener("skx-cookie-consent", sync)
    }
  }, [])

  if (!enabled) return null
  return <Analytics />
}
