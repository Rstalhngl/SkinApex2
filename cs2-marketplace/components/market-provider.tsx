"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import type { Skin } from "@/lib/skins"
import { formatPrice, skins as demoSkins } from "@/lib/skins"
import { loadCS2Items, setVolumeMap, setPriceMap } from "@/lib/cs2-api"
import { pushActivity } from "@/lib/activity-feed"
import { createOrder } from "@/lib/orders"
import { useI18n } from "@/lib/i18n"

export interface SteamProfile {
  steamId: string
  steamName: string | null
  steamAvatar: string | null
}

interface MarketContextValue {
  // Items
  items: Skin[]
  isLoadingItems: boolean
  // Cart
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
  // Auth
  isLoggedIn: boolean
  steamProfile: SteamProfile | null
  login: (profile?: SteamProfile) => void
  logout: () => void
  // Trade URL
  tradeUrl: string
  setTradeUrl: (url: string) => void
  // Sell
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

  // ── Items state ──────────────────────────────────────────────────────────
  const [items, setItems] = useState<Skin[]>(demoSkins)
  const [isLoadingItems, setIsLoadingItems] = useState(true)

  // ── Market state ─────────────────────────────────────────────────────────
  const [cart, setCart] = useState<Skin[]>([])
  const [wishlist, setWishlist] = useState<number[]>([])
  const [wallet, setWallet] = useState(18900)  // TRY
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [steamProfile, setSteamProfile] = useState<SteamProfile | null>(null)
  const [tradeUrl, setTradeUrlState] = useState("")
  const [listedSkins, setListedSkins] = useState<number[]>([])

  // ── Fetch live USD→TRY rate on mount, refresh every hour ─────────────────────
  useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await fetch("/api/exchange-rate")
        const data = await res.json()
        if (data?.rate) setUsdToTry(data.rate)
      } catch {}
    }
    fetchRate()
    const interval = setInterval(fetchRate, 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // ── Fetch market volume then load items ───────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setIsLoadingItems(true)

    // Fetch real market volume first (sets popularity scores), then load items
    const loadItems = () => {
      loadCS2Items()
        .then((loaded) => { if (!cancelled) setItems(loaded) })
        .catch(() => {})
        .finally(() => { if (!cancelled) setIsLoadingItems(false) })
    }

    fetch("/api/market-volume")
      .then(r => r.json())
      .then(d => { if (d?.volume) setVolumeMap(d.volume); if (d?.prices) setPriceMap(d.prices) })
      .catch(() => {})
      .finally(() => { if (!cancelled) loadItems() })
    return () => { cancelled = true }
  }, [])

  // ── Restore session / handle Steam callback ───────────────────────────────
  useEffect(() => {
    try {
      const savedTradeUrl = localStorage.getItem(LS_TRADE_URL)
      if (savedTradeUrl) setTradeUrlState(savedTradeUrl)
    } catch {}

    try {
      const saved = localStorage.getItem(LS_LISTED)
      if (saved) setListedSkins(JSON.parse(saved))
    } catch {}

    const steamId = searchParams.get("steamId")
    if (steamId) {
      // Explicit Steam login — clear any logout flag
      try { localStorage.removeItem("skx_logged_out") } catch {}
      const profile: SteamProfile = {
        steamId,
        steamName: searchParams.get("steamName"),
        steamAvatar: searchParams.get("steamAvatar"),
      }
      setSteamProfile(profile)
      setIsLoggedIn(true)
      try { localStorage.setItem(LS_STEAM, JSON.stringify(profile)) } catch {}
      toast.success(t("toast.login.title"), {
        description: t("toast.steam.loginSuccess", { name: profile.steamName ?? `...${steamId.slice(-4)}` }),
      })
      router.replace("/", { scroll: false })
      return
    }

    // Restore session only if user has NOT explicitly logged out this browser session
    const explicitLogout = (() => { try { return localStorage.getItem("skx_logged_out") === "1" } catch { return false } })()
    if (!explicitLogout) {
      try {
        const saved = localStorage.getItem(LS_STEAM)
        if (saved) {
          const profile: SteamProfile = JSON.parse(saved)
          setSteamProfile(profile)
          setIsLoggedIn(true)
        }
      } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Auth ─────────────────────────────────────────────────────────────────
  const login = useCallback((profile?: SteamProfile) => {
    setIsLoggedIn(true)
    if (profile) {
      setSteamProfile(profile)
      try { localStorage.setItem(LS_STEAM, JSON.stringify(profile)) } catch {}
    }
    toast.success(t("toast.login.title"), { description: t("toast.login.desc") })
  }, [t])

  const logout = useCallback(() => {
    setIsLoggedIn(false)
    setSteamProfile(null)
    try { localStorage.removeItem(LS_STEAM) } catch {}
    toast.success(t("toast.logout.title"), { description: t("toast.logout.desc") })
  }, [t])

  // ── Trade URL ─────────────────────────────────────────────────────────────
  const setTradeUrl = useCallback((url: string) => {
    setTradeUrlState(url)
    try { localStorage.setItem(LS_TRADE_URL, url) } catch {}
  }, [])

  // ── Cart helpers ──────────────────────────────────────────────────────────
  const isInCart = useCallback((id: number) => cart.some((s) => s.id === id), [cart])
  const isWished = useCallback((id: number) => wishlist.includes(id), [wishlist])

  const addToCart = useCallback((skin: Skin) => {
    // Check current state first, then update — no side effects inside setter
    setCart((prev) => {
      if (prev.some((s) => s.id === skin.id)) return prev
      return [...prev, skin]
    })
    // Fire toasts/activity OUTSIDE the setter (avoid setState-during-render)
    setCart((latest) => {
      const added = latest.some((s) => s.id === skin.id)
      if (added) {
        queueMicrotask(() => {
          toast.success(t("toast.addedToCart"), {
            description: `${skin.type} | ${skin.title} — ${formatPrice(skin.price)}`,
          })
          pushActivity(`${skin.type} | ${skin.title}`, "carted", formatPrice(skin.price))
        })
      } else {
        queueMicrotask(() => {
          toast.info(t("toast.alreadyInCart"), { description: `${skin.type} | ${skin.title}` })
        })
      }
      return latest
    })
  }, [t])

  const removeFromCart = useCallback((id: number) => {
    setCart((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const clearCart = useCallback(() => setCart([]), [])

  const toggleWishlist = useCallback((skin: Skin) => {
    setWishlist((prev) => {
      const removing = prev.includes(skin.id)
      if (!removing) {
        queueMicrotask(() => {
          toast.success(t("toast.addedToWishlist"), { description: `${skin.type} | ${skin.title}` })
          pushActivity(`${skin.type} | ${skin.title}`, "wishlisted", formatPrice(skin.price))
        })
      }
      return removing ? prev.filter((x) => x !== skin.id) : [...prev, skin.id]
    })
  }, [t])

  const deposit = useCallback((amount: number) => {
    setWallet((prev) => prev + amount)
    toast.success(t("toast.depositSuccess"), {
      description: t("toast.depositDesc", { amount: formatPrice(amount) }),
    })
  }, [t])

  const cartTotal = useMemo(() => cart.reduce((sum, s) => sum + s.price, 0), [cart])

  const checkout = useCallback(() => {
    if (cart.length === 0) { toast.error(t("toast.cartEmpty")); return }
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
    cart.forEach((skin) => {
      pushActivity(`${skin.type} | ${skin.title}`, "bought", formatPrice(skin.price))
      createOrder(skin, skin.price)
    })
    setCart([])
  }, [cart, cartTotal, wallet, t])

  // ── Sell ──────────────────────────────────────────────────────────────────
  const listForSale = useCallback((skin: Skin, price: number) => {
    setListedSkins((prev) => {
      const next = prev.includes(skin.id) ? prev : [...prev, skin.id]
      try { localStorage.setItem(LS_LISTED, JSON.stringify(next)) } catch {}
      return next
    })
    pushActivity(`${skin.type} | ${skin.title}`, "listed", formatPrice(price))
    toast.success(t("sell.listed"), {
      description: t("sell.listedDesc", { item: `${skin.type} | ${skin.title}`, price: formatPrice(price) }),
    })
  }, [t])

  const delistSkin = useCallback((id: number) => {
    setListedSkins((prev) => {
      const next = prev.filter((x) => x !== id)
      try { localStorage.setItem(LS_LISTED, JSON.stringify(next)) } catch {}
      return next
    })
    toast.info(t("sell.delisted"))
  }, [t])

  // ── Context value ─────────────────────────────────────────────────────────
  const value = useMemo(() => ({
    items, isLoadingItems,
    cart, wishlist, wallet, cartTotal,
    addToCart, removeFromCart, clearCart,
    toggleWishlist, isInCart, isWished,
    deposit, checkout,
    isLoggedIn, steamProfile, login, logout,
    tradeUrl, setTradeUrl,
    listedSkins, listForSale, delistSkin,
  }), [
    items, isLoadingItems,
    cart, wishlist, wallet, cartTotal,
    addToCart, removeFromCart, clearCart,
    toggleWishlist, isInCart, isWished,
    deposit, checkout,
    isLoggedIn, steamProfile, login, logout,
    tradeUrl, setTradeUrl,
    listedSkins, listForSale, delistSkin,
  ])

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>
}

export function useMarket() {
  const ctx = useContext(MarketContext)
  if (!ctx) throw new Error("useMarket must be used within MarketProvider")
  return ctx
}
