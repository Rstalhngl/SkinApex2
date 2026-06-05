"use client"

import { LogIn } from "lucide-react"
import { useI18n } from "@/lib/i18n"

export function LoginGate() {
  const { t } = useI18n()

  const handleLogin = () => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get("_ingress_token")
    const origin = encodeURIComponent(window.location.origin)
    const url = `/api/auth/steam?origin=${origin}` + (token ? `&_ingress_token=${encodeURIComponent(token)}` : "")
    window.location.href = url
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <LogIn className="h-7 w-7 text-primary" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{t("gate.title")}</p>
        <p className="text-xs text-muted-foreground">{t("gate.desc")}</p>
      </div>
      <button
        onClick={handleLogin}
        className="flex items-center gap-2 rounded-md bg-[#171a21] px-4 py-2.5 text-xs font-semibold text-white ring-1 ring-inset ring-white/10 transition-all hover:bg-[#1b2838] hover:ring-[#66c0f4]/60"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#66c0f4]" fill="currentColor">
          <path d="M11.98 0C5.67 0 .5 4.87.02 11.06l6.43 2.66a3.4 3.4 0 0 1 1.92-.59l2.86-4.15v-.06a4.54 4.54 0 1 1 4.54 4.54h-.1l-4.08 2.92.01.4a3.41 3.41 0 0 1-6.76.66L.07 15.4C1.52 20.4 6.32 24 11.98 24 18.62 24 24 18.63 24 12S18.62 0 11.98 0z" />
        </svg>
        {t("header.loginSteam")}
      </button>
    </div>
  )
}
