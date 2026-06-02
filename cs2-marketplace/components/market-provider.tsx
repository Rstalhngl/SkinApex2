"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import type { Skin } from "@/lib/skins"
import { formatPrice } from "@/lib/skins"
import { useI18n } from "@/lib/i18n"

export interface SteamProfile {
  steamId: string
  steamName: string | null
  steamAvatar: string | null
}

interface MarketContextValue {
  cart: Skin[]
  wishlist: number[]
  wallet: number
  cartTotal: number
  addToCart: (skin: Skin) => void
  removeFromCart: (id: number) => void
  clearCart: () => void
  toggleWishlist: (skin: Skin) => void
  isInCart: (id: number) => boolean
  isWished: (id: number) => boolean
  deposit: (amount: number) => void
  checkout: () => void
  isLoggedIn: boolean
  steamProfile: SteamProfile | null
  login: (profile?: SteamProfile) => void
  logout: () => void
  tradeUrl: string
  setTradeUrl: (url: string) => void
  listedSkins: number[]
  listForSale: (skin: Skin, price: number) => void
  delistSkin: (id: number) => void
}

const MarketContext = createContext<MarketContextValue | null>(null)

const LS_STEAM = "skx_steam_profile"
const LS_TRADE_URL = "skx_trade_url"
const LS_LISTED = "skx_listed_skins"

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const { t } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [cart, setCart] = useState<Skin[]>([])
  const [wishlist, setWishlist] = useState<number[]>([])
  const [wallet, setWallet] = useState(412.8)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [steamProfile, setSteamProfile] = useState<SteamProfile | null>(null)
  const [tradeUrl, setTradeUrlState] = useState("")
  const [listedSkins, setListedSkins] = useState<number[]>([])

  // Restore session from localStorage on mount + handle Steam callback params
  useEffect(() => {
    // Load persisted trade URL
    try {
      const savedTradeUrl = localStorage.getItem(LS_TRADE_URL)
      if (savedTradeUrl) setTradeUrlState(savedTradeUrl)
    } catch {}

    // Load persisted listed skins
    try {
      const saved = localStorage.getItem(LS_LISTED)
      if (saved) setListedSkins(JSON.parse(saved))
    } catch {}

    // Check for Steam callback params first
    const steamId = searchParams.get("steamId")
    if (steamId) {
      const profile: SteamProfile = {
        steamId,
        steamName: searchParams.get("steamName"),
        steamAvatar: searchParams.get("steamAvatar"),
      }
      setSteamProfile(profile)
      setIsLoggedIn(true)
      try {
        localStorage.setItem(LS_STEAM, JSON.stringify(profile))
      } catch {}
      toast.success(t("toast.login.title"), {
        description: t("toast.steam.loginSuccess", { name: profile.steamName ?? `...${steamId.slice(-4)}` }),
      })
      // Clear query params from URL without reloading
      router.replace("/", { scroll: false })
      return
    }

    // Otherwise restore from localStorage
    try {
      const saved = localStorage.getItem(LS_STEAM)
      if (saved) {
        const profile: SteamProfile = JSON.parse(saved)
        setSteamProfile(profile)
        setIsLoggedIn(true)
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = useCallback(
    (profile?: SteamProfile) => {
      setIsLoggedIn(true)
      if (profile) {
        setSteamProfile(profile)
        try {
          localStorage.setItem(LS_STEAM, JSON.stringify(profile))
        } catch {}
      }
      toast.success(t("toast.login.title"), { description: t("toast.login.desc") })
    },
    [t],
  )

  const logout = useCallback(() => {
    setIsLoggedIn(false)
    setSteamProfile(null)
    try {
      localStorage.removeItem(LS_STEAM)
    } catch {}
    toast.success(t("toast.logout.title"), { description: t("toast.logout.desc") })
  }, [t])

  const setTradeUrl = useCallback(
    (url: string) => {
      setTradeUrlState(url)
      try {
        localStorage.setItem(LS_TRADE_URL, url)
      } catch {}
    },
    [],
  )

  const isInCart = useCallback((id: number) => cart.some((s) => s.id === id), [cart])
  const isWished = useCallback((id: number) => wishlist.includes(id), [wishlist])

  const addToCart = useCallback(
    (skin: Skin) => {
      setCart((prev) => {
        if (prev.some((s) => s.id === skin.id)) {
          toast.info(t("toast.alreadyInCart"), { description: `${skin.type} | ${skin.title}` })
          return prev
        }
        toast.success(t("toast.addedToCart"), {
          description: `${skin.type} | ${skin.title} — ${formatPrice(skin.price)}`,
        })
        return [...prev, skin]
      })
    },
    [t],
  )

  const removeFromCart = useCallback((id: number) => {
    setCart((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const clearCart = useCallback(() => setCart([]), [])

  const toggleWishlist = useCallback(
    (skin: Skin) => {
      setWishlist((prev) => {
        if (prev.includes(skin.id)) {
          return prev.filter((x) => x !== skin.id)
        }
        toast.success(t("toast.addedToWishlist"), { description: `${skin.type} | ${skin.title}` })
        return [...prev, skin.id]
      })
    },
    [t],
  )

  const deposit = useCallback(
    (amount: number) => {
      setWallet((prev) => prev + amount)
      toast.success(t("toast.depositSuccess"), {
        description: t("toast.depositDesc", { amount: formatPrice(amount) }),
      })
    },
    [t],
  )

  const cartTotal = useMemo(() => cart.reduce((sum, s) => sum + s.price, 0), [cart])

  const checkout = useCallback(() => {
    if (cart.length === 0) {
      toast.error(t("toast.cartEmpty"))
      return
    }
    if (cartTotal > wallet) {
      toast.error(t("toast.insufficientTitle"), {
        description: t("toast.insufficientDesc", { amount: formatPrice(cartTotal - wallet) }),
      })
      return
    }
    setWallet((prev) => prev - cartTotal)
    toast.success(t("toast.purchaseTitle"), {
      description: t("toast.purchaseDesc", { n: cart.length }),
    })
    setCart([])
  }, [cart, cartTotal, wallet, t])

  const listForSale = useCallback(
    (skin: Skin, price: number) => {
      setListedSkins((prev) => {
        const next = prev.includes(skin.id) ? prev : [...prev, skin.id]
        try {
          localStorage.setItem(LS_LISTED, JSON.stringify(next))
        } catch {}
        return next
      })
      toast.success(t("sell.listed"), {
        description: t("sell.listedDesc", { item: `${skin.type} | ${skin.title}`, price: formatPrice(price) }),
      })
    },
    [t],
  )

  const delistSkin = useCallback(
    (id: number) => {
      setListedSkins((prev) => {
        const next = prev.filter((x) => x !== id)
        try {
          localStorage.setItem(LS_LISTED, JSON.stringify(next))
        } catch {}
        return next
      })
      toast.info(t("sell.delisted"))
    },
    [t],
  )

  const value = useMemo(
    () => ({
      cart,
      wishlist,
      wallet,
      cartTotal,
      addToCart,
      removeFromCart,
      clearCart,
      toggleWishlist,
      isInCart,
      isWished,
      deposit,
      checkout,
      isLoggedIn,
      steamProfile,
      login,
      logout,
      tradeUrl,
      setTradeUrl,
      listedSkins,
      listForSale,
      delistSkin,
    }),
    [
      cart,
      wishlist,
      wallet,
      cartTotal,
      addToCart,
      removeFromCart,
      clearCart,
      toggleWishlist,
      isInCart,
      isWished,
      deposit,
      checkout,
      isLoggedIn,
      steamProfile,
      login,
      logout,
      tradeUrl,
      setTradeUrl,
      listedSkins,
      listForSale,
      delistSkin,
    ],
  )

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>
}

export function useMarket() {
  const ctx = useContext(MarketContext)
  if (!ctx) throw new Error("useMarket must be used within MarketProvider")
  return ctx
}
