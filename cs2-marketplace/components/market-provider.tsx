"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import type { Skin } from "@/lib/skins"
import { formatPrice, isOwnListing, setUsdToTry, skins as demoSkins } from "@/lib/skins"
import { loadCS2Items, setVolumeMap, setPriceMap } from "@/lib/cs2-api"
import { pushActivity } from "@/lib/activity-feed"
import {
  purchaseBatch,
  subscribeListings,
  syncListings,
} from "@/lib/listings"
import { LIVE_SYNC_MS, WS_FALLBACK_SYNC_MS } from "@/lib/live-sync"
import {
  connectWs,
  disconnectWs,
  isWsConnected,
  subscribeWsChannel,
  subscribeWsConnection,
} from "@/lib/ws-client"
import { syncUserSales } from "@/lib/sales"
import { syncOffers } from "@/lib/offers"
import { syncUserNotifications } from "@/lib/user-notifications"
import {
  fetchUserData,
  fetchWalletData,
  patchUserData,
  requestCashout,
  walletDeposit,
  type UserData,
} from "@/lib/user-data-client"
import { ProfileCompletionDialog } from "@/components/profile-completion-dialog"
import { apiFetch } from "@/lib/api-client"
import { checkoutErrorMessage } from "@/lib/checkout-errors"
import { useI18n } from "@/lib/i18n"
import { readBalanceHidden, writeBalanceHidden } from "@/lib/wallet-visibility"
import { resolveCartItems } from "@/lib/cart-resolver"

export interface SteamProfile {
  steamId: string
  steamName: string | null
  steamAvatar: string | null
}

interface MarketContextValue {
  items: Skin[]
  isLoadingItems: boolean
  cart: Skin[]
  wishlist: string[]
  wallet: number
  balanceHidden: boolean
  toggleBalanceHidden: () => void
  withdrawableBalance: number
  profileComplete: boolean
  userProfile: Pick<UserData, "firstName" | "lastName" | "email">
  openProfileCompletion: () => void
  cartTotal: number
  addToCart: (skin: Skin) => void
  removeFromCart: (listingId: string) => void
  clearCart: () => void
  toggleWishlist: (skin: Skin) => void
  isInCart: (listingId?: string) => boolean
  isWished: (listingId?: string) => boolean
  deposit: (amount: number) => Promise<void>
  withdraw: (amount: number, iban: string, accountHolderName: string) => Promise<boolean>
  checkout: (tradeUrl: string, mssAccepted: boolean) => Promise<void>
  isLoggedIn: boolean
  steamProfile: SteamProfile | null
  login: (profile?: SteamProfile) => void
  logout: () => void
  tradeUrl: string
  setTradeUrl: (url: string) => void
  listedSkins: number[]
  listForSale: (skin: Skin, price: number) => void
  delistSkin: (id: number) => void
  refreshWallet: () => Promise<void>
}

const MarketContext = createContext<MarketContextValue | null>(null)

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const { t } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [items, setItems] = useState<Skin[]>(demoSkins)
  const [isLoadingItems, setIsLoadingItems] = useState(true)
  const [cartListingIds, setCartListingIds] = useState<string[]>([])
  const [cartSkins, setCartSkins] = useState<Skin[]>([])
  const cartListingIdsRef = useRef<string[]>([])
  const cartSkinsRef = useRef<Skin[]>([])
  const cartSnapshotsRef = useRef<Map<string, Skin>>(new Map())
  const cartPersistSeqRef = useRef(0)
  cartListingIdsRef.current = cartListingIds
  cartSkinsRef.current = cartSkins
  const [wishlist, setWishlist] = useState<string[]>([])
  const [wallet, setWallet] = useState(0)
  const [balanceHidden, setBalanceHidden] = useState(false)
  const [withdrawableBalance, setWithdrawableBalance] = useState(0)
  const [profileComplete, setProfileComplete] = useState(false)
  const [userProfile, setUserProfile] = useState<Pick<UserData, "firstName" | "lastName" | "email">>({})
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [steamProfile, setSteamProfile] = useState<SteamProfile | null>(null)
  const [tradeUrl, setTradeUrlState] = useState("")
  const [listedSkins, setListedSkins] = useState<number[]>([])

  const persistCartIds = useCallback(async (ids: string[]) => {
    cartListingIdsRef.current = ids
    if (!isLoggedIn) return
    const seq = ++cartPersistSeqRef.current
    await patchUserData({ cartListingIds: ids })
    if (seq !== cartPersistSeqRef.current && cartListingIdsRef.current !== ids) {
      await patchUserData({ cartListingIds: cartListingIdsRef.current })
    }
  }, [isLoggedIn])

  const applyCartState = useCallback((ids: string[], skins: Skin[]) => {
    cartListingIdsRef.current = ids
    cartSkinsRef.current = skins
    const idSet = new Set(ids)
    for (const skin of skins) {
      if (skin.listingId) cartSnapshotsRef.current.set(skin.listingId, skin)
    }
    for (const listingId of cartSnapshotsRef.current.keys()) {
      if (!idSet.has(listingId)) cartSnapshotsRef.current.delete(listingId)
    }
    setCartListingIds(ids)
    setCartSkins(skins)
  }, [])

  const hydrateCart = useCallback((
    ids: string[] | undefined,
    steamId?: string,
    opts?: { force?: boolean },
  ) => {
    const sourceIds = ids ?? cartListingIdsRef.current
    if (sourceIds.length === 0 && cartListingIdsRef.current.length === 0) return

    const resolved = resolveCartItems(
      sourceIds,
      steamId,
      cartSkinsRef.current,
      cartSnapshotsRef.current,
    )

    const prevLen = cartListingIdsRef.current.length
    if (
      !opts?.force &&
      ids === undefined &&
      resolved.skins.length < prevLen &&
      resolved.prunedIds.length === 0
    ) {
      return
    }

    applyCartState(resolved.ids, resolved.skins)
    if (isLoggedIn && resolved.prunedIds.length > 0) {
      void persistCartIds(resolved.ids)
    }
  }, [isLoggedIn, applyCartState, persistCartIds])

  const refreshWallet = useCallback(async () => {
    if (!isLoggedIn) return
    const data = await fetchWalletData()
    setWallet(data?.balance ?? 0)
    setWithdrawableBalance(data?.withdrawableBalance ?? 0)
  }, [isLoggedIn])

  const loadUserData = useCallback(async (steamId?: string) => {
    const [userRes, walletData] = await Promise.all([fetchUserData(), fetchWalletData()])
    if (userRes?.data) {
      const d = userRes.data
      const ids = d.cartListingIds ?? []
      setWishlist(d.wishlistListingIds ?? [])
      if (d.tradeUrl) setTradeUrlState(d.tradeUrl)
      setProfileComplete(Boolean(userRes.profileComplete))
      setUserProfile({ firstName: d.firstName, lastName: d.lastName, email: d.email })
      await syncListings()
      hydrateCart(ids, steamId, { force: true })
    }
    setWallet(walletData?.balance ?? 0)
    setWithdrawableBalance(walletData?.withdrawableBalance ?? 0)
  }, [hydrateCart])

  const openProfileCompletion = useCallback(() => {
    setProfileDialogOpen(true)
  }, [])

  useEffect(() => {
    setBalanceHidden(readBalanceHidden())
  }, [])

  const toggleBalanceHidden = useCallback(() => {
    setBalanceHidden((prev) => {
      const next = !prev
      writeBalanceHidden(next)
      return next
    })
  }, [])

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

  useEffect(() => {
    let cancelled = false
    setIsLoadingItems(true)
    const loadItems = () => {
      loadCS2Items()
        .then((loaded) => { if (!cancelled) setItems(loaded) })
        .catch(() => {})
        .finally(() => { if (!cancelled) setIsLoadingItems(false) })
    }
    fetch("/api/market-volume")
      .then((r) => r.json())
      .then((d) => { if (d?.volume) setVolumeMap(d.volume); if (d?.prices) setPriceMap(d.prices) })
      .catch(() => {})
      .finally(() => { if (!cancelled) loadItems() })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const init = async () => {
      const authSuccess = searchParams.get("authSuccess")
      const authError = searchParams.get("authError")

      const res = await apiFetch("/api/auth/session")
      const sessionData = await res.json()
      const ok = sessionData.loggedIn && sessionData.steamId
      if (ok) {
        setSteamProfile({
          steamId: sessionData.steamId,
          steamName: sessionData.steamName ?? null,
          steamAvatar: sessionData.steamAvatar ?? null,
        })
        setIsLoggedIn(true)
        await loadUserData(sessionData.steamId)
      }
      if (authSuccess && ok) {
        toast.success(t("toast.login.title"), {
          description: t("toast.steam.loginSuccess", {
            name: sessionData.steamName ?? `...${String(sessionData.steamId).slice(-4)}`,
          }),
        })
      }
      if (authError) {
        toast.error(t("toast.login.title"), { description: t("toast.authFailed") })
      }
      if (authSuccess || authError) router.replace("/", { scroll: false })
    }
    void init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const steamId = steamProfile?.steamId
    if (!steamId) return
    const unsub = subscribeListings(() => hydrateCart(undefined, steamId))
    return unsub
  }, [steamProfile?.steamId, hydrateCart])

  useEffect(() => {
    void connectWs(steamProfile?.steamId)
    return () => disconnectWs()
  }, [steamProfile?.steamId])

  useEffect(() => {
    if (!isLoggedIn) return

    const ping = () => {
      void apiFetch("/api/presence", { method: "POST" }).catch(() => {})
    }

    ping()
    const interval = setInterval(ping, 45_000)
    const onVisible = () => {
      if (document.visibilityState === "visible") ping()
    }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [isLoggedIn])

  useEffect(() => {
    const steamId = steamProfile?.steamId
    const syncAll = () => {
      void syncListings().then(() => {
        if (cartListingIdsRef.current.length > 0) hydrateCart(undefined, steamId)
      })
      if (isLoggedIn && steamId) {
        void syncUserNotifications()
        void syncUserSales()
        void syncOffers(steamId)
        void refreshWallet()
      }
    }

    const unsubListings = subscribeWsChannel("listings", () => {
      void syncListings().then(() => {
        if (cartListingIdsRef.current.length > 0) hydrateCart(undefined, steamId)
      })
    })
    const unsubSales = subscribeWsChannel("sales", () => { if (isLoggedIn && steamId) void syncUserSales() })
    const unsubNotif = subscribeWsChannel("notifications", () => { if (isLoggedIn && steamId) void syncUserNotifications() })
    const unsubOffers = subscribeWsChannel("offers", () => { if (isLoggedIn && steamId) void syncOffers(steamId) })
    const unsubWallet = subscribeWsChannel("wallet", () => { if (isLoggedIn) void refreshWallet() })

    syncAll()

    let interval: ReturnType<typeof setInterval> | null = null
    const startPolling = (wsConnected: boolean) => {
      if (interval) clearInterval(interval)
      interval = setInterval(syncAll, wsConnected ? WS_FALLBACK_SYNC_MS : LIVE_SYNC_MS)
    }
    startPolling(isWsConnected())
    const unsubConn = subscribeWsConnection(startPolling)

    const onVisible = () => { if (document.visibilityState === "visible") syncAll() }
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("focus", syncAll)

    return () => {
      unsubListings()
      unsubSales()
      unsubNotif()
      unsubOffers()
      unsubWallet()
      unsubConn()
      if (interval) clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("focus", syncAll)
    }
  }, [isLoggedIn, steamProfile?.steamId, refreshWallet, hydrateCart])

  const login = useCallback((profile?: SteamProfile) => {
    setIsLoggedIn(true)
    if (profile) setSteamProfile(profile)
    void loadUserData(profile?.steamId)
    toast.success(t("toast.login.title"), { description: t("toast.login.desc") })
  }, [t, loadUserData])

  const logout = useCallback(async () => {
    try { await apiFetch("/api/auth/logout", { method: "POST" }) } catch {}
    setIsLoggedIn(false)
    setSteamProfile(null)
    setWallet(0)
    applyCartState([], [])
    cartSnapshotsRef.current.clear()
    setWishlist([])
    toast.success(t("toast.logout.title"), { description: t("toast.logout.desc") })
  }, [t, applyCartState])

  const setTradeUrl = useCallback(async (url: string) => {
    setTradeUrlState(url)
    if (isLoggedIn) await patchUserData({ tradeUrl: url })
  }, [isLoggedIn])

  const persistWishlist = useCallback(async (ids: string[]) => {
    setWishlist(ids)
    if (isLoggedIn) await patchUserData({ wishlistListingIds: ids })
  }, [isLoggedIn])

  const addToCart = useCallback((skin: Skin) => {
    if (!isLoggedIn) {
      toast.error(t("gate.title"), { description: t("gate.desc") })
      return
    }
    if (!skin.listingId) return
    if (isOwnListing(skin, steamProfile?.steamId)) {
      toast.error(t("toast.ownListing"))
      return
    }
    if (cartListingIdsRef.current.includes(skin.listingId)) {
      toast.info(t("toast.alreadyInCart"), { description: `${skin.type} | ${skin.title}` })
      return
    }
    cartSnapshotsRef.current.set(skin.listingId, skin)
    const nextIds = [...cartListingIdsRef.current, skin.listingId]
    const nextSkins = [...cartSkinsRef.current, skin]
    applyCartState(nextIds, nextSkins)
    void persistCartIds(nextIds)
    toast.success(t("toast.addedToCart"), {
      description: `${skin.type} | ${skin.title} — ${formatPrice(skin.price)}`,
    })
    pushActivity(`${skin.type} | ${skin.title}`, "carted", formatPrice(skin.price))
  }, [applyCartState, persistCartIds, t, steamProfile?.steamId, isLoggedIn])

  const removeFromCart = useCallback((listingId: string) => {
    const nextIds = cartListingIdsRef.current.filter((id) => id !== listingId)
    const nextSkins = cartSkinsRef.current.filter((s) => s.listingId !== listingId)
    applyCartState(nextIds, nextSkins)
    void persistCartIds(nextIds)
  }, [applyCartState, persistCartIds])

  const clearCart = useCallback(() => {
    cartSnapshotsRef.current.clear()
    applyCartState([], [])
    void persistCartIds([])
  }, [applyCartState, persistCartIds])

  const isInCart = useCallback(
    (listingId?: string) => !!listingId && cartListingIds.includes(listingId),
    [cartListingIds],
  )

  const isWished = useCallback(
    (listingId?: string) => !!listingId && wishlist.includes(listingId),
    [wishlist],
  )

  const toggleWishlist = useCallback((skin: Skin) => {
    if (!isLoggedIn) {
      toast.error(t("gate.title"), { description: t("gate.desc") })
      return
    }
    if (!skin.listingId) return
    if (isOwnListing(skin, steamProfile?.steamId)) {
      toast.error(t("toast.ownListing"))
      return
    }
    const removing = wishlist.includes(skin.listingId)
    const next = removing
      ? wishlist.filter((id) => id !== skin.listingId)
      : [...wishlist, skin.listingId]
    void persistWishlist(next)
    if (!removing) {
      toast.success(t("toast.addedToWishlist"), { description: `${skin.type} | ${skin.title}` })
      pushActivity(`${skin.type} | ${skin.title}`, "wishlisted", formatPrice(skin.price))
    }
  }, [wishlist, persistWishlist, t, steamProfile?.steamId, isLoggedIn])

  const deposit = useCallback(async (amount: number) => {
    if (!isLoggedIn) return
    const balance = await walletDeposit(amount)
    if (balance === "deposits_disabled") {
      toast.error(t("deposit.disabled"))
      return
    }
    if (balance == null) {
      toast.error(t("deposit.failed"))
      return
    }
    setWallet(balance)
    toast.success(t("toast.depositSuccess"), {
      description: t("toast.depositDesc", { amount: formatPrice(amount) }),
    })
  }, [isLoggedIn, t])

  const withdraw = useCallback(async (amount: number, iban: string, accountHolderName: string) => {
    if (!isLoggedIn) return false
    if (!profileComplete) {
      openProfileCompletion()
      return false
    }
    const result = await requestCashout({ amount, iban, accountHolderName })
    if (!result.ok) {
      if (result.error === "withdraw_disabled") toast.error(t("withdraw.disabled"))
      else if (result.error === "profile_incomplete") openProfileCompletion()
      else if (result.error === "name_mismatch") toast.error(t("withdraw.nameMismatch"))
      else if (result.error === "invalid_iban") toast.error(t("withdraw.invalidIban"))
      else if (result.error === "insufficient_withdrawable") toast.error(t("withdraw.insufficientWithdrawable"))
      else if (result.error === "below_minimum") toast.error(t("withdraw.belowMin", { min: String(result.min ?? 100) }))
      else toast.error(t("withdraw.failed"))
      return false
    }
    await refreshWallet()
    return true
  }, [isLoggedIn, profileComplete, openProfileCompletion, refreshWallet, t])

  const cartTotal = useMemo(
    () => cartSkins.reduce((sum, s) => sum + s.price, 0),
    [cartSkins],
  )

  const checkout = useCallback(async (tradeUrlValue: string, mssAccepted: boolean) => {
    if (!isLoggedIn || !steamProfile) {
      toast.error(t("toast.login.title"), { description: t("toast.login.desc") })
      return
    }
    if (!profileComplete) {
      openProfileCompletion()
      return
    }
    if (!mssAccepted) {
      toast.error(t("checkout.mssRequired"))
      return
    }
    if (cartSkins.length === 0) { toast.error(t("toast.cartEmpty")); return }
    if (cartTotal > wallet) {
      toast.error(t("toast.insufficientTitle"), {
        description: t("toast.insufficientDesc", { amount: formatPrice(cartTotal - wallet) }),
      })
      return
    }

    const listingIds = cartSkins.map((s) => s.listingId).filter((id): id is string => !!id)
    if (listingIds.length === 0) { toast.error(t("toast.cartEmpty")); return }

    const result = await purchaseBatch(listingIds, tradeUrlValue, mssAccepted)
    if (!result.ok) {
      if (result.error === "profile_incomplete") {
        openProfileCompletion()
        return
      }
      toast.error(t("checkout.failed"), {
        description: checkoutErrorMessage(result.error, t),
      })
      await refreshWallet()
      return
    }

    await refreshWallet()
    toast.success(t("toast.purchaseTitle"), {
      description: t("toast.purchaseDesc", { n: cartSkins.length }),
    })
    cartSkins.forEach((skin) => {
      pushActivity(`${skin.type} | ${skin.title}`, "bought", formatPrice(skin.price))
    })
    clearCart()
    void syncUserNotifications()
    void syncUserSales()
  }, [cartSkins, cartTotal, wallet, isLoggedIn, steamProfile, profileComplete, openProfileCompletion, t, clearCart, refreshWallet])

  const listForSale = useCallback((_skin: Skin, _price: number) => {
    toast.info(t("sell.useInventory"), {
      description: t("sell.useInventoryDesc"),
    })
  }, [t])

  const delistSkin = useCallback((id: number) => {
    setListedSkins((prev) => prev.filter((x) => x !== id))
    toast.info(t("sell.delisted"))
  }, [t])

  const value = useMemo(() => ({
    items, isLoadingItems,
    cart: cartSkins, wishlist, wallet, balanceHidden, toggleBalanceHidden, withdrawableBalance, cartTotal,
    profileComplete, userProfile, openProfileCompletion,
    addToCart, removeFromCart, clearCart,
    toggleWishlist, isInCart, isWished,
    deposit, withdraw, checkout,
    isLoggedIn, steamProfile, login, logout,
    tradeUrl, setTradeUrl,
    listedSkins, listForSale, delistSkin,
    refreshWallet,
  }), [
    items, isLoadingItems,
    cartSkins, wishlist, wallet, balanceHidden, toggleBalanceHidden, withdrawableBalance, cartTotal,
    profileComplete, userProfile, openProfileCompletion,
    addToCart, removeFromCart, clearCart,
    toggleWishlist, isInCart, isWished,
    deposit, withdraw, checkout,
    isLoggedIn, steamProfile, login, logout,
    tradeUrl, setTradeUrl,
    listedSkins, listForSale, delistSkin,
    refreshWallet,
  ])

  return (
    <MarketContext.Provider value={value}>
      {children}
      <ProfileCompletionDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        initial={userProfile}
        onCompleted={() => {
          void loadUserData(steamProfile?.steamId)
        }}
      />
    </MarketContext.Provider>
  )
}

export function useMarket() {
  const ctx = useContext(MarketContext)
  if (!ctx) throw new Error("useMarket must be used within MarketProvider")
  return ctx
}
