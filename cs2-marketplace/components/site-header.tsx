"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { Banknote, ChevronDown, ExternalLink, Gavel, Globe, Handshake, LogOut, Moon, PackageCheck, Settings, Sun, User, Wallet } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CartSheet } from "@/components/cart-sheet"
import { WishlistSheet } from "@/components/wishlist-sheet"
import { DepositDialog } from "@/components/deposit-dialog"
import { TradeUrlDialog } from "@/components/trade-url-dialog"
import { WithdrawDialog } from "@/components/withdraw-dialog"
import { NotificationsBell } from "@/components/notifications-bell"
import { OffersSheet } from "@/components/offers-sheet"
import { OrdersSheet } from "@/components/orders-sheet"
import { ProfileSheet } from "@/components/profile-sheet"
import { useMarket } from "@/components/market-provider"
import { CURRENT_USER, formatPrice, steamInventoryUrl, steamProfileUrl } from "@/lib/skins"
import { LANGS, useI18n } from "@/lib/i18n"
import { apiFetch } from "@/lib/api-client"
import { cn } from "@/lib/utils"

const SNOWFLAKES = [
  { left: "18%", size: "3px", drift: "3px", duration: "3.6s", delay: "0s" },
  { left: "30%", size: "2px", drift: "-2px", duration: "4.4s", delay: "1.6s" },
  { left: "44%", size: "3px", drift: "2px", duration: "3.2s", delay: "0.8s" },
  { left: "55%", size: "2.5px", drift: "-3px", duration: "4s", delay: "2.3s" },
  { left: "66%", size: "3px", drift: "2px", duration: "3.8s", delay: "1.1s" },
  { left: "78%", size: "2px", drift: "-2px", duration: "4.6s", delay: "0.4s" },
  { left: "88%", size: "2.5px", drift: "3px", duration: "3.4s", delay: "2.8s" },
]

export function SiteHeader({
  onResetFilters,
  onShowMyListings,
}: {
  onResetFilters: () => void
  onShowMyListings: () => void
}) {
  const { wallet, isLoggedIn, steamProfile, logout } = useMarket()
  const { lang, setLang, t } = useI18n()
  const { resolvedTheme, setTheme } = useTheme()
  const [depositOpen, setDepositOpen] = useState(false)
  const [tradeUrlOpen, setTradeUrlOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const currentLang = LANGS.find((l) => l.code === lang) ?? LANGS[0]

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!isLoggedIn) {
      setIsAdmin(false)
      return
    }
    void apiFetch("/api/admin/me")
      .then((res) => res.json())
      .then((data: { isAdmin?: boolean }) => setIsAdmin(Boolean(data.isAdmin)))
      .catch(() => setIsAdmin(false))
  }, [isLoggedIn])
  const isDark = !mounted || resolvedTheme === "dark"

  const displayName = steamProfile?.steamName ?? steamProfile?.steamId ?? t("header.guestName")
  const displayAvatar = steamProfile?.steamAvatar ?? null

  return (
    <>
      <header className="sticky top-0 z-50 flex items-center justify-between gap-4 border-b border-border bg-card/85 px-4 py-3 backdrop-blur-md md:px-[4%]">
        <button onClick={onResetFilters} className="group flex items-center gap-3" aria-label={t("header.home")}>
          <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-inset ring-primary/25 transition-all duration-300 group-hover:ring-primary/50 group-hover:shadow-[0_0_18px_-2px] group-hover:shadow-primary/40">
            <span aria-hidden="true" className="pointer-events-none absolute inset-0">
              {SNOWFLAKES.map((flake, i) => (
                <span
                  key={i}
                  className="logo-snowflake"
                  style={{
                    left: flake.left,
                    width: flake.size,
                    height: flake.size,
                    "--snow-drift": flake.drift,
                    animationDuration: flake.duration,
                    animationDelay: flake.delay,
                  } as React.CSSProperties}
                />
              ))}
            </span>
            <svg viewBox="0 0 24 24" className="relative h-7 w-7" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="apex-grad" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#7dd3fc" />
                  <stop offset="1" stopColor="#0ea5e9" />
                </linearGradient>
              </defs>
              <path d="M12 3 22 21H2L12 3Z" fill="url(#apex-grad)" />
              <path
                d="M12 3 16.4 10.6C15.7 10.9 15.2 10.1 14.5 10.5 13.9 10.9 13.2 10.1 12.6 10.6 12.4 10.8 11.6 10.8 11.4 10.6 10.8 10.1 10.1 10.9 9.5 10.5 8.8 10.1 8.3 10.9 7.6 10.6L12 3Z"
                fill="#ffffff"
              />
              <path d="M12 12.5 16.5 19H7.5L12 12.5Z" fill="#0b1220" fillOpacity="0.4" />
            </svg>
          </span>
          <span className="text-xl font-light tracking-tight text-foreground md:text-2xl">
            Skin
            <strong className="bg-gradient-to-r from-primary to-sky-300 bg-clip-text font-extrabold text-transparent">
              Apex
            </strong>
          </span>
        </button>

        <div className="flex items-center gap-2 md:gap-4">
          {!isLoggedIn && (
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams(window.location.search)
                const token = params.get("_ingress_token")
                const origin = encodeURIComponent(window.location.origin)
                const url = `/api/auth/steam?origin=${origin}` + (token ? `&_ingress_token=${encodeURIComponent(token)}` : "")
                window.location.href = url
              }}
              className="flex items-center gap-2 rounded-md bg-[#171a21] px-3 py-2 text-xs font-semibold text-white ring-1 ring-inset ring-white/10 transition-all hover:bg-[#1b2838] hover:ring-[#66c0f4]/60"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#66c0f4]" fill="currentColor" aria-hidden="true">
                <path d="M11.98 0C5.67 0 .5 4.87.02 11.06l6.43 2.66a3.4 3.4 0 0 1 1.92-.59l2.86-4.15v-.06a4.54 4.54 0 1 1 4.54 4.54h-.1l-4.08 2.92.01.4a3.41 3.41 0 0 1-6.76.66L.07 15.4C1.52 20.4 6.32 24 11.98 24 18.62 24 24 18.63 24 12S18.62 0 11.98 0zM7.55 18.21l-1.47-.61a2.56 2.56 0 0 0 1.33 1.26 2.56 2.56 0 0 0 3.34-1.38 2.55 2.55 0 0 0 0-1.95 2.55 2.55 0 0 0-1.39-1.39 2.56 2.56 0 0 0-1.96-.02l1.52.63a1.88 1.88 0 1 1-1.45 3.47zm10.74-9.16a3.03 3.03 0 1 0-6.06 0 3.03 3.03 0 0 0 6.06 0zm-5.3 0a2.27 2.27 0 1 1 4.54 0 2.27 2.27 0 0 1-4.54 0z" />
              </svg>
              <span className="hidden lg:inline">{t("header.loginSteam")}</span>
            </button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={t("header.language")}
              className="hidden items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground transition-colors hover:border-primary sm:flex"
            >
              <Globe className="h-3.5 w-3.5" />
              {currentLang.short}
              <ChevronDown className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-border bg-card">
              {LANGS.map((l) => (
                <DropdownMenuItem
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={cn(
                    "cursor-pointer text-foreground focus:bg-input focus:text-primary",
                    l.code === lang && "text-primary",
                  )}
                >
                  <Globe className="h-3.5 w-3.5" />
                  {l.label}
                  <span className="ml-auto text-xs text-muted-foreground">{l.short}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <NotificationsBell />
          <WishlistSheet />
          <CartSheet />

          {isLoggedIn && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 rounded-full border border-border bg-input py-1 pl-1 pr-3 transition-colors hover:border-primary">
              <span className="h-7 w-7 overflow-hidden rounded-full border-2 border-primary">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={displayAvatar || "/placeholder.svg"}
                  alt={displayName}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </span>
              <span className="hidden flex-col items-start leading-tight sm:flex">
                <span className="text-xs font-semibold text-foreground">{displayName}</span>
                <span className="text-[11px] font-bold text-success">{formatPrice(wallet)}</span>
              </span>
              <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 border-border bg-card">
              <div className="px-2 py-1.5 sm:hidden">
                <p className="text-sm font-semibold text-foreground">{displayName}</p>
                <p className="text-xs font-bold text-success">{formatPrice(wallet)}</p>
              </div>
              <DropdownMenuSeparator className="bg-border sm:hidden" />
              <ProfileSheet trigger={
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="cursor-pointer text-foreground focus:bg-input focus:text-primary"
                >
                  <User className="h-4 w-4" />
                  {t("header.profile")}
                </DropdownMenuItem>
              } />
              <OffersSheet trigger={
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="cursor-pointer text-foreground focus:bg-input focus:text-primary"
                >
                  <Handshake className="h-4 w-4" />
                  {t("header.myOffers")}
                </DropdownMenuItem>
              } />
              <OrdersSheet trigger={
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="cursor-pointer text-foreground focus:bg-input focus:text-primary"
                >
                  <PackageCheck className="h-4 w-4" />
                  {t("header.myOrders")}
                </DropdownMenuItem>
              } />
              {isAdmin && (
                <DropdownMenuItem asChild className="cursor-pointer text-primary focus:bg-input focus:text-primary">
                  <Link href="/admin">
                    <Gavel className="h-4 w-4" />
                    {t("header.admin")}
                  </Link>
                </DropdownMenuItem>
              )}
              {steamProfile?.steamId && (
                <>

                  <DropdownMenuItem asChild className="cursor-pointer text-foreground focus:bg-input focus:text-primary">
                    <a
                      href={steamProfileUrl(steamProfile.steamId)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                        <path d="M11.98 0C5.67 0 .5 4.87.02 11.06l6.43 2.66a3.4 3.4 0 0 1 1.92-.59l2.86-4.15v-.06a4.54 4.54 0 1 1 4.54 4.54h-.1l-4.08 2.92.01.4a3.41 3.41 0 0 1-6.76.66L.07 15.4C1.52 20.4 6.32 24 11.98 24 18.62 24 24 18.63 24 12S18.62 0 11.98 0z" />
                      </svg>
                      {t("header.steamProfile")}
                      <ExternalLink className="ml-auto h-3.5 w-3.5 opacity-50" />
                    </a>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem
                onClick={() => setTradeUrlOpen(true)}
                className="cursor-pointer text-foreground focus:bg-input focus:text-primary"
              >
                <Settings className="h-4 w-4" />
                {t("header.tradeUrl")}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={() => setDepositOpen(true)}
                className="cursor-pointer text-success focus:bg-success/10 focus:text-success"
              >
                <Wallet className="h-4 w-4" />
                {t("header.deposit")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setWithdrawOpen(true)}
                className="cursor-pointer text-foreground focus:bg-input focus:text-primary"
              >
                <Banknote className="h-4 w-4" />
                {t("header.withdraw")}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault()
                  setTheme(isDark ? "light" : "dark")
                }}
                className="cursor-pointer text-foreground focus:bg-input focus:text-primary"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {isDark ? t("header.theme.light") : t("header.theme.dark")}
              </DropdownMenuItem>
              {isLoggedIn && (
                <>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem
                    onClick={logout}
                    className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    {t("header.logout")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          )}
        </div>
      </header>

      <DepositDialog open={depositOpen} onOpenChange={setDepositOpen} />
      <WithdrawDialog open={withdrawOpen} onOpenChange={setWithdrawOpen} />
      <TradeUrlDialog open={tradeUrlOpen} onOpenChange={setTradeUrlOpen} />
    </>
  )
}
