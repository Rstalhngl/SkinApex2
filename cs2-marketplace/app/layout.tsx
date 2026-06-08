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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL?.trim() || 'https://skinapex.net'),
  title: 'SkinApex — Global CS2 Skin Marketplace',
  description:
    'Buy, sell and trade CS2 skins instantly with secure P2P escrow. Live market prices, float inspection, StatTrak™ and Souvenir items.',
  applicationName: 'SkinApex',
  generator: 'SkinApex',
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/icon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/favicon.ico',
  },
  openGraph: {
    title: 'SkinApex — Global CS2 Skin Marketplace',
    description:
      'Buy, sell and trade CS2 skins instantly with secure P2P escrow.',
    siteName: 'SkinApex',
    type: 'website',
    images: [{ url: '/icon-512.png', width: 512, height: 512, alt: 'SkinApex' }],
  },
  twitter: {
    card: 'summary',
    title: 'SkinApex — Global CS2 Skin Marketplace',
    images: ['/icon-512.png'],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background" suppressHydrationWarning>
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
