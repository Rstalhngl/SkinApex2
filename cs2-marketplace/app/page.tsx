import { Suspense } from "react"
import { I18nProvider } from "@/lib/i18n"
import { MarketProvider } from "@/components/market-provider"
import { Marketplace } from "@/components/marketplace"

export default function Home() {
  return (
    <Suspense>
      <I18nProvider>
        <MarketProvider>
          <Marketplace />
        </MarketProvider>
      </I18nProvider>
    </Suspense>
  )
}
