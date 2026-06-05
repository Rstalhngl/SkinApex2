import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { CookieBanner } from '@/components/cookie-banner'
import { AiChat } from '@/components/ai-chat'
import { RadixPointerFix } from '@/components/radix-pointer-fix'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'SkinApex — Global CS2 Skin Marketplace',
  description:
    'Buy, sell and trade CS2 skins instantly with secure P2P escrow. Live market prices, float inspection, StatTrak™ and Souvenir items.',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
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
        {process.env.NODE_ENV === 'production' && <Analytics />}
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
