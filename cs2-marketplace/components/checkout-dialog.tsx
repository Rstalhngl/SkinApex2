"use client"

import { useEffect, useState } from "react"
import { Link, ShoppingCart } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useMarket } from "@/components/market-provider"
import { useI18n } from "@/lib/i18n"
import { formatPrice } from "@/lib/skins"
import { isValidTradeUrl } from "@/lib/trade-url"
import { toast } from "sonner"

export function CheckoutDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useI18n()
  const { cart, cartTotal, wallet, tradeUrl, setTradeUrl, checkout } = useMarket()
  const [value, setValue] = useState(tradeUrl)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) setValue(tradeUrl)
  }, [open, tradeUrl])

  const valid = isValidTradeUrl(value)
  const insufficient = cartTotal > wallet

  const handleConfirm = async () => {
    if (!valid) {
      toast.error(t("tradeUrl.invalid"), { description: t("tradeUrl.invalidDesc") })
      return
    }
    if (insufficient) {
      toast.error(t("toast.insufficientTitle"))
      return
    }
    setSubmitting(true)
    const trimmed = value.trim()
    setTradeUrl(trimmed)
    try {
      await checkout(trimmed)
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <ShoppingCart className="h-5 w-5 text-primary" />
            {t("checkout.title")}
          </DialogTitle>
          <DialogDescription>{t("checkout.desc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-border bg-input p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("cart.total")}</span>
              <span className="font-bold text-success">{formatPrice(cartTotal)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">{t("cart.wallet")}</span>
              <span className="font-semibold text-foreground">{formatPrice(wallet)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="checkout-trade-url" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <Link className="mr-1 inline h-3.5 w-3.5" />
              {t("checkout.tradeUrlLabel")}
            </Label>
            <Input
              id="checkout-trade-url"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t("tradeUrl.placeholder")}
              className="border-border bg-input text-foreground"
            />
            <p className="text-[11px] text-muted-foreground">{t("checkout.tradeUrlHint")}</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleConfirm}
            disabled={!valid || insufficient || submitting || cart.length === 0}
            className="w-full bg-primary font-bold uppercase tracking-wide text-primary-foreground hover:bg-primary/90"
          >
            {submitting ? t("checkout.processing") : t("checkout.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
