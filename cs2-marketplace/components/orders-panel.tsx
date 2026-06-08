"use client"

import { useEffect, useState } from "react"
import { ExternalLink, PackageCheck, ShieldAlert, ShoppingBag, Tag, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  confirmSaleReceived,
  disputeSale,
  formatDeliveryCountdown,
  getSalesAsBuyer,
  getSalesAsSeller,
  markSaleDelivered,
  subscribeUserSales,
  syncUserSales,
} from "@/lib/sales"
import { SALE_STATUS_COLOR, type Sale, type SaleStatus } from "@/lib/sale-types"
import { formatPrice } from "@/lib/skins"
import { useMarket } from "@/components/market-provider"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

function saleStatusLabel(status: SaleStatus, t: (k: string) => string) {
  return t(`sale.status.${status}`)
}

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
  const canConfirm = sale.status === "pending_delivery" && sale.deliveryDeadline > Date.now()
  const canDispute = sale.status === "pending_delivery" && sale.deliveryDeadline > Date.now()

  const handleConfirm = async () => {
    const ok = await confirmSaleReceived(sale.id)
    if (ok) toast.success(t("orders.confirmed"))
    else toast.error(t("orders.actionFailed"))
  }

  const handleDispute = async () => {
    const ok = await disputeSale(sale.id)
    if (ok) toast.success(t("orders.disputeOpened"))
    else toast.error(t("orders.actionFailed"))
  }

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
          {saleStatusLabel(sale.status, t)}
        </p>
        <DeliveryCountdown sale={sale} />
        {(canConfirm || canDispute) && (
          <div className="mt-1.5 flex gap-1.5">
            {canConfirm && (
              <Button size="sm" className="h-6 px-2 text-[10px]" onClick={handleConfirm}>
                {t("orders.confirmReceived")}
              </Button>
            )}
            {canDispute && (
              <Button size="sm" variant="destructive" className="h-6 gap-1 px-2 text-[10px]" onClick={handleDispute}>
                <ShieldAlert className="h-3 w-3" />
                {t("order.supportTicket")}
              </Button>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

function SellerSaleRow({ sale }: { sale: Sale }) {
  const { t } = useI18n()
  const active = sale.status === "pending_delivery" && sale.deliveryDeadline > Date.now()
  const awaitingBuyer = active && !!sale.deliveredAt
  const canMarkDeliver = active && !sale.deliveredAt
  const msLeft = useCountdown(sale.deliveryDeadline, active)

  const handleDeliver = async () => {
    const ok = await markSaleDelivered(sale.id)
    if (ok) toast.success(t("orders.markedDelivered"), { description: t("orders.markedDeliveredDesc") })
    else toast.error(t("orders.actionFailed"))
  }

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
          {saleStatusLabel(sale.status, t)}
        </p>
        {active && (
          <p className="text-[10px] font-semibold text-yellow-400">
            {t("orders.deliveryLeft")}: {formatDeliveryCountdown(msLeft)}
          </p>
        )}
        {awaitingBuyer && (
          <p className="text-[10px] font-semibold text-primary">
            {t("orders.awaitingBuyerConfirm")}
          </p>
        )}
        {sale.buyerTradeUrl && canMarkDeliver && (
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
        {canMarkDeliver && (
          <Button size="sm" className="mt-1.5 h-6 gap-1 px-2 text-[10px]" onClick={handleDeliver}>
            <Truck className="h-3 w-3" />
            {t("orders.markDelivered")}
          </Button>
        )}
      </div>
    </li>
  )
}

export function OrdersPanel({ className }: { className?: string }) {
  const { t } = useI18n()
  const { steamProfile } = useMarket()
  const [purchases, setPurchases] = useState<Sale[]>(() => getSalesAsBuyer())
  const [sales, setSales] = useState<Sale[]>(() => getSalesAsSeller())

  useEffect(() => {
    const steamId = steamProfile?.steamId
    if (!steamId) return
    void syncUserSales(steamId)
    return subscribeUserSales(() => {
      setPurchases([...getSalesAsBuyer()])
      setSales([...getSalesAsSeller()])
    })
  }, [steamProfile?.steamId])

  const hasPurchases = purchases.length > 0
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
          {t("orders.purchases")} ({purchases.length})
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
