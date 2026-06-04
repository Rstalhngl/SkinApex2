"use client"

import { useEffect, useState } from "react"
import { ExternalLink, HeartHandshake, Mail, PackageCheck, ShieldAlert } from "lucide-react"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  getOrders, subscribeOrders, openSupportTicket, escrowTimeLeft,
  STATUS_LABEL, STATUS_COLOR, type Order,
} from "@/lib/orders"
import { formatPrice } from "@/lib/skins"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const SUPPORT_EMAIL = "support@skinapex.net"

function SupportDialog({
  order,
  onClose,
}: {
  order: Order | null
  onClose: () => void
}) {
  const { t } = useI18n()
  if (!order) return null

  const subject = encodeURIComponent(`Destek Talebi — Sipariş ${order.id}: ${order.skinName}`)
  const body = encodeURIComponent(
    `Sipariş ID: ${order.id}\n` +
    `Ürün: ${order.skinName} (${order.exterior})\n` +
    `Tutar: ${formatPrice(order.priceTry)}\n` +
    `Satın Alma Tarihi: ${new Date(order.boughtAt).toLocaleDateString("tr-TR")}\n\n` +
    `Sorun Açıklaması:\n[Lütfen sorununuzu buraya yazınız]`,
  )

  const handleSubmit = () => {
    const opened = openSupportTicket(order.id)
    if (opened) {
      toast.success("Destek talebi oluşturuldu", {
        description: "Mail uygulamanız açılıyor...",
      })
      window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`
    } else {
      toast.error("Destek talebi oluşturulamadı", {
        description: "Sipariş için destek süresi dolmuş olabilir.",
      })
    }
    onClose()
  }

  return (
    <Dialog open={!!order} onOpenChange={o => !o && onClose()}>
      <DialogContent className="border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Destek Talebi
          </DialogTitle>
          <DialogDescription>
            {order.skinName} — {order.exterior}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-sm text-muted-foreground">
          <div className="rounded-lg border border-border bg-input p-3 space-y-1">
            <div className="flex justify-between">
              <span>Sipariş ID</span>
              <span className="font-semibold text-foreground">{order.id}</span>
            </div>
            <div className="flex justify-between">
              <span>Tutar</span>
              <span className="font-semibold text-foreground">{formatPrice(order.priceTry)}</span>
            </div>
            <div className="flex justify-between">
              <span>Emanet Süresi</span>
              <span className="font-semibold text-yellow-400">{escrowTimeLeft(order)}</span>
            </div>
          </div>

          <p className="text-xs leading-relaxed">
            Destek talebiniz <strong className="text-foreground">{SUPPORT_EMAIL}</strong> adresine
            yönlendirilecektir. Mail uygulamanız otomatik olarak açılacak. Talebiniz incelendikten sonra
            en kısa sürede geri dönüş yapılacaktır.
          </p>

          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-400">
            <strong>Önemli:</strong> Satıcının ürünü geri çektiği doğrulanırsa ödemeniz iade edilir
            ve satıcı 1 hafta süreyle ilan açamaz.
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="border-border" onClick={onClose}>
            İptal
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-destructive font-semibold text-white hover:bg-destructive/90"
          >
            <Mail className="mr-2 h-4 w-4" />
            Destek Talebi Oluştur
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function OrderRow({ order }: { order: Order }) {
  const [hovered, setHovered] = useState(false)
  const [supportOrder, setSupportOrder] = useState<Order | null>(null)
  const canDispute = order.status === "escrow" && Date.now() < order.escrowReleasesAt

  return (
    <>
      <li
        className="relative flex items-center gap-3 px-5 py-3 border-b border-border last:border-0 transition-colors hover:bg-input/50"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="flex h-14 w-16 shrink-0 items-center justify-center rounded-md bg-input">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={order.skinImg || "/placeholder.svg"} alt={order.skinName}
            className="max-h-12 max-w-[85%] object-contain" referrerPolicy="no-referrer" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground">{order.skinName}</p>
          <p className="text-[11px] text-muted-foreground">{order.exterior}</p>
          <p className="text-xs font-bold text-primary">{formatPrice(order.priceTry)}</p>
          <p className={cn("text-[10px] font-semibold", STATUS_COLOR[order.status])}>
            {STATUS_LABEL[order.status]}
            {order.status === "escrow" && (
              <span className="ml-1 text-muted-foreground/60">({escrowTimeLeft(order)})</span>
            )}
          </p>
        </div>

        {/* Hover: support button */}
        {hovered && canDispute && (
          <Button
            size="sm"
            variant="destructive"
            className="absolute right-4 h-8 gap-1.5 text-xs"
            onClick={() => setSupportOrder(order)}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Destek Talebi
          </Button>
        )}
        {hovered && order.status === "disputed" && (
          <Button size="sm" variant="outline" className="absolute right-4 h-8 gap-1.5 border-border text-xs" asChild>
            <a href={`mailto:${SUPPORT_EMAIL}`}>
              <Mail className="h-3.5 w-3.5" />
              Takip Et
            </a>
          </Button>
        )}
      </li>

      <SupportDialog order={supportOrder} onClose={() => setSupportOrder(null)} />
    </>
  )
}

export function OrdersSheet({ trigger }: { trigger?: React.ReactNode }) {
  const { t } = useI18n()
  const [orders, setOrders] = useState<Order[]>(() => getOrders())

  useEffect(() => {
    return subscribeOrders(() => setOrders([...getOrders()]))
  }, [])

  const escrowOrders = orders.filter(o => o.status === "escrow")

  return (
    <Sheet>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent className="flex w-full flex-col gap-0 border-border bg-card p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <PackageCheck className="h-5 w-5 text-primary" />
            {t("orders.title")}
          </SheetTitle>
        </SheetHeader>

        {/* Escrow info banner */}
        {escrowOrders.length > 0 && (
          <div className="border-b border-yellow-500/20 bg-yellow-500/10 px-5 py-3">
            <p className="text-xs text-yellow-400">
              <strong>{escrowOrders.length} sipariş</strong> 8 günlük emanet sürecinde.
              Ürün teslim edilmezse "Destek Talebi" oluşturabilirsiniz.
            </p>
          </div>
        )}

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <HeartHandshake className="h-10 w-10 opacity-30" />
            <p className="text-sm">{t("orders.empty")}</p>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <ul>{orders.map(o => <OrderRow key={o.id} order={o} />)}</ul>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  )
}
