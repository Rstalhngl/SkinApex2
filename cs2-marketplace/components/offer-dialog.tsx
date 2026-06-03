"use client"

import { useState } from "react"
import { Handshake } from "lucide-react"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { useMarket } from "@/components/market-provider"
import { type Skin, formatPrice, formatUSD, getUsdToTry } from "@/lib/skins"
import { sendOffer } from "@/lib/offers"
import { useI18n } from "@/lib/i18n"
import { toast } from "sonner"

const MIN_RATIO = 0.60

const fmt = (v: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(v)

export function OfferDialog({
  skin,
  onClose,
}: {
  skin: Skin | null
  onClose: () => void
}) {
  const { steamProfile, isLoggedIn } = useMarket()
  const { t } = useI18n()

  // All values stored internally as TRY
  const rate = getUsdToTry()
  const listingTry  = skin ? Math.round(skin.price * rate) : 0
  const minTry      = skin ? Math.round(skin.price * MIN_RATIO * rate) : 0

  const [tryValue, setTryValue] = useState<number>(listingTry)

  const handleOpen = (open: boolean) => {
    if (!open) onClose()
    else if (skin) setTryValue(Math.round(skin.price * getUsdToTry()))
  }

  const handleSlider = (val: number[]) => {
    if (!skin) return
    const newTry = Math.round(minTry + (val[0] / 100) * (listingTry - minTry))
    setTryValue(newTry)
  }

  const sliderPct = listingTry > minTry
    ? Math.round(((tryValue - minTry) / (listingTry - minTry)) * 100)
    : 100

  const usdEquiv = tryValue / rate

  const handleSend = () => {
    if (!skin) return
    if (!isLoggedIn) { toast.error(t("offer.loginRequired")); return }
    if (tryValue < minTry) { toast.error(t("offer.tooLow", { min: fmt(minTry) })); return }
    const userName = steamProfile?.steamName ?? "Anonim"
    sendOffer(
      { id: skin.id, type: skin.type, title: skin.title, img: skin.img, price: skin.price },
      usdEquiv,
      userName,
      steamProfile?.steamAvatar,
    )
    toast.success(t("offer.sent"), {
      description: `${skin.type} | ${skin.title} — ${fmt(tryValue)}`,
    })
    onClose()
  }

  if (!skin) return null

  return (
    <Dialog open={!!skin} onOpenChange={handleOpen}>
      <DialogContent className="border-border bg-card sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Handshake className="h-5 w-5 text-primary" />
            {t("offer.title")}
          </DialogTitle>
          <DialogDescription>
            {skin.type} | {skin.title} — {skin.exterior}
          </DialogDescription>
        </DialogHeader>

        <div className="my-1 flex h-28 items-center justify-center rounded-lg bg-input">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={skin.img || "/placeholder.svg"} alt={skin.title}
            className="max-h-full max-w-[70%] object-contain drop-shadow"
            referrerPolicy="no-referrer" />
        </div>

        <div className="space-y-4 py-1">
          {/* Listing price reference */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-input px-3 py-2 text-sm">
            <span className="text-muted-foreground">{t("offer.listingPrice")}</span>
            <div className="flex flex-col items-end">
              <span className="font-bold text-foreground">{formatPrice(skin.price)}</span>
              <span className="text-[10px] text-muted-foreground/60">{formatUSD(skin.price)}</span>
            </div>
          </div>

          {/* TRY input */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("offer.yourOffer")}
            </Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₺</span>
                <Input
                  type="number"
                  min={minTry}
                  max={listingTry}
                  step={1}
                  value={tryValue}
                  onChange={e => {
                    const v = parseInt(e.target.value)
                    if (!isNaN(v)) setTryValue(Math.min(listingTry, Math.max(minTry, v)))
                  }}
                  className="border-border bg-input pl-7 text-foreground"
                />
              </div>
              <span className="text-[11px] text-muted-foreground min-w-[64px] text-right">
                ≈ {formatUSD(usdEquiv)}
              </span>
            </div>
            <Slider
              min={0} max={100} step={1}
              value={[Math.max(0, Math.min(100, sliderPct))]}
              onValueChange={handleSlider}
              className="mt-1"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{t("offer.min")} {fmt(minTry)} (%60)</span>
              <span>{t("offer.max")} {fmt(listingTry)} (%100)</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSend}
            disabled={tryValue < minTry}
            className="w-full bg-primary font-bold uppercase tracking-wide text-primary-foreground hover:bg-primary/90"
          >
            <Handshake className="mr-2 h-4 w-4" />
            {t("offer.send")} — {fmt(tryValue)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
