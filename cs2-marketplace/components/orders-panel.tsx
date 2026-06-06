"use client"

import { useEffect, useState } from "react"
import { ExternalLink, PackageCheck, ShieldAlert, ShoppingBag, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  getOrders, subscribeOrders, openSupportTicket, escrowTimeLeft,
  STATUS_COLOR, type Order,
} from "@/lib/orders"
import {
  formatDeliveryCountdown, getSalesAsBuyer, getSalesAsSeller,
  subscribeUserSales, syncUserSales,
} from "@/lib/sales"
import { SALE_STATUS_COLOR, SALE_STATUS_LABEL, type Sale } from "@/lib/sale-types"
import { formatPrice } from "@/lib/skins"
import { useMarket } from "@/components/market-provider"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

function useCountdown(deadline: number, active: boolean) {
  const [msLeft, setMsLeft] = useState(() => deadline - Date.now())

  useEffect(() => {
    if (!active) return
    const tick = () => setMsLeft(deadline - Date.now())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [deadline, active])

  return msLeft
}

function DeliveryCountdown({ sale }: { sale: Sale }) {
  const { t } = useI18n()
  const active = sale.status === "pending_delivery" && sale.deliveryDeadline > Date.now()
  const msLeft = useCountdown(sale.deliveryDeadline, active)

  if (!active) return null

  return (
    <p className="text-[10px] font-semibold text-yellow-400">
      {t("orders.deliveryLeft")}: {formatDeliveryCountdown(msLeft)}
    </p>
  )
}

function PurchaseRow({ sale }: { sale: Sale }) {
  const { t } = useI18n()

  return (
    <li className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
      <div className="flex h-12 w-14 shrink-0 items-center justify-center rounded-md bg-input">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={sale.itemImg || "/placeholder.svg"}
          alt={sale.itemName}
          className="max-h-10 max-w-[85%] object-contain"
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-foreground">{sale.itemName}</p>
        <p className="text-[10px] text-muted-foreground">
          {sale.exterior} · {t("orders.seller")}: {sale.sellerName}
        </p>
        <p className="text-xs font-bold text-primary">{formatPrice(sale.priceTry)}</p>
        <p className={cn("text-[10px] font-semibold", SALE_STATUS_COLOR[sale.status])}>
          {SALE_STATUS_LABEL[sale.status]}
        </p>
        <DeliveryCountdown sale={sale} />
      </div>
    </li>
  )
}

function EscrowOrderRow({ order }: { order: Order }) {
  const { t } = useI18n()
  const [hovered, setHovered] = useState(false)
  const canDispute = order.status === "escrow" && Date.now() < order.escrowReleasesAt

  return (
    <li
      className="relative flex items-center gap-3 border-b border-border px-4 py-3 last:border-0 hover:bg-input/40 transition-colors"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex h-12 w-14 shrink-0 items-center justify-center rounded-md bg-input">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={order.skinImg || "/placeholder.svg"} alt={order.skinName}
          className="max-h-10 max-w-[85%] object-contain" referrerPolicy="no-referrer" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-foreground">{order.skinName}</p>
        <p className="text-[10px] text-muted-foreground">
          {order.exterior} · {new Date(order.boughtAt).toLocaleDateString("tr-TR")}
        </p>
        <p className="text-xs font-bold text-success">{formatPrice(order.priceTry)}</p>
        <p className={cn("text-[10px] font-semibold", STATUS_COLOR[order.status])}>
          {t(`order.status.${order.status}`)}
          {order.status === "escrow" && (
            <span className="ml-1 text-muted-foreground/60">({escrowTimeLeft(order)})</span>
          )}
        </p>
      </div>
      {hovered && canDispute && (
        <Button size="sm" variant="destructive" className="absolute right-3 h-7 gap-1 text-[10px]"
          onClick={() => openSupportTicket(order.id)}>
          <ShieldAlert className="h-3 w-3" />
          {t("order.supportTicket")}
        </Button>
      )}
    </li>
  )
}

function SellerSaleRow({ sale }: { sale: Sale }) {
  const { t } = useI18n()
  const active = sale.status === "pending_delivery" && sale.deliveryDeadline > Date.now()
  const msLeft = useCountdown(sale.deliveryDeadline, active)

  return (
    <li className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
      <div className="flex h-12 w-14 shrink-0 items-center justify-center rounded-md bg-input">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={sale.itemImg || "/placeholder.svg"}
          alt={sale.itemName}
          className="max-h-10 max-w-[85%] object-contain"
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-foreground">{sale.itemName}</p>
        <p className="text-[10px] text-muted-foreground">
          {sale.exterior} · {t("orders.buyer")}: {sale.buyerName}
        </p>
        <p className="text-xs font-bold text-success">{formatPrice(sale.netToSeller)}</p>
        <p className={cn("text-[10px] font-semibold", SALE_STATUS_COLOR[sale.status])}>
          {SALE_STATUS_LABEL[sale.status]}
        </p>
        {active && (
          <p className="text-[10px] font-semibold text-yellow-400">
            {t("orders.deliveryLeft")}: {formatDeliveryCountdown(msLeft)}
          </p>
        )}
        {sale.buyerTradeUrl && active && (
          <a
            href={sale.buyerTradeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3" />
            {t("orders.buyerTradeUrl")}
          </a>
        )}
      </div>
    </li>
  )
}

export function OrdersPanel({ className }: { className?: string }) {
  const { t } = useI18n()
  const { steamProfile } = useMarket()
  const [orders, setOrders] = useState<Order[]>(() => getOrders())
  const [purchases, setPurchases] = useState<Sale[]>(() => getSalesAsBuyer())
  const [sales, setSales] = useState<Sale[]>(() => getSalesAsSeller())

  useEffect(() => subscribeOrders(() => setOrders([...getOrders()])), [])

  useEffect(() => {
    const steamId = steamProfile?.steamId
    if (!steamId) return
    void syncUserSales(steamId)
    return subscribeUserSales(() => {
      setPurchases([...getSalesAsBuyer()])
      setSales([...getSalesAsSeller()])
    })
  }, [steamProfile?.steamId])

  const hasPurchases = purchases.length > 0 || orders.length > 0
  const hasSales = sales.length > 0
  const empty = !hasPurchases && !hasSales

  if (empty) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground", className)}>
        <PackageCheck className="h-10 w-10 opacity-30" />
        <p className="text-sm">{t("orders.empty")}</p>
      </div>
    )
  }

  return (
    <Tabs defaultValue="purchases" className={cn("flex flex-col", className)}>
      <TabsList className="mx-4 mt-3 mb-1 grid grid-cols-2 bg-input">
        <TabsTrigger value="purchases" className="gap-1.5 text-xs">
          <ShoppingBag className="h-3.5 w-3.5" />
          {t("orders.purchases")} ({purchases.length + orders.length})
        </TabsTrigger>
        <TabsTrigger value="sales" className="gap-1.5 text-xs">
          <Tag className="h-3.5 w-3.5" />
          {t("orders.sales")} ({sales.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="purchases" className="mt-0 flex-1">
        {!hasPurchases ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">{t("orders.noPurchases")}</p>
        ) : (
          <ul>
            {purchases.map((s) => <PurchaseRow key={s.id} sale={s} />)}
            {orders.map((o) => <EscrowOrderRow key={o.id} order={o} />)}
          </ul>
        )}
      </TabsContent>

      <TabsContent value="sales" className="mt-0 flex-1">
        {!hasSales ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">{t("orders.noSales")}</p>
        ) : (
          <ul>
            {sales.map((s) => <SellerSaleRow key={s.id} sale={s} />)}
          </ul>
        )}
      </TabsContent>
    </Tabs>
  )
}
