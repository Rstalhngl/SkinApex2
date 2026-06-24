import type { Metadata } from "next"
import { Suspense } from "react"
import { I18nProvider } from "@/lib/i18n"
import { MarketProvider } from "@/components/market-provider"
import { AdminPanel } from "@/components/admin-panel"

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
}

export default function AdminPage() {
  return (
    <Suspense>
      <I18nProvider>
        <MarketProvider>
          <AdminPanel />
        </MarketProvider>
      </I18nProvider>
    </Suspense>
  )
}
