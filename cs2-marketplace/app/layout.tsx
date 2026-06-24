import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { AnalyticsLoader } from '@/components/analytics-loader'
import { CookieBanner } from '@/components/cookie-banner'
import { AiChat } from '@/components/ai-chat'
import { RadixPointerFix } from '@/components/radix-pointer-fix'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://skinapex.net"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "SkinApex — Global CS2 Skin Marketplace",
    template: "%s — SkinApex",
  },
  description:
    "Buy, sell and trade CS2 skins instantly with secure P2P escrow. Live market prices, float inspection, StatTrak™ and Souvenir items.",
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: siteUrl,
    siteName: "SkinApex",
    title: "SkinApex — Global CS2 Skin Marketplace",
    description:
      "Buy, sell and trade CS2 skins instantly with secure P2P escrow.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SkinApex — Global CS2 Skin Marketplace",
    description:
      "Buy, sell and trade CS2 skins instantly with secure P2P escrow.",
  },
  robots: { index: true, follow: true },
  alternates: { canonical: siteUrl },
  generator: "SkinApex",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr" className="bg-background" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
          <Toaster position="bottom-right" />
          <CookieBanner />
          <AiChat />
          <RadixPointerFix />
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <AnalyticsLoader />}
        <script dangerouslySetInnerHTML={{ __html: `
  const observer = new MutationObserver(() => {
    document.body.style.pointerEvents = "auto";
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ["style"] });
` }} />
      </body>
    </html>
  )
}
