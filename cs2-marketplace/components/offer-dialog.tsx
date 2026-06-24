"use client"

import { useState } from "react"
import Link from "next/link"
import { Handshake } from "lucide-react"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { useMarket } from "@/components/market-provider"
import { type Skin, formatPrice, formatUSD } from "@/lib/skins"
import { sendOffer } from "@/lib/offers"
import { offerErrorMessage } from "@/lib/checkout-errors"
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
  const { steamProfile, isLoggedIn, tradeUrl, profileComplete, openProfileCompletion } = useMarket()
  const { t } = useI18n()
  const [sending, setSending] = useState(false)
  const [mssAccepted, setMssAccepted] = useState(false)

  const listingTry = skin ? Math.round(skin.price) : 0
  const minTry = skin ? Math.round(skin.price * MIN_RATIO) : 0

  const [inputStr, setInputStr] = useState<string>(String(listingTry))

  const tryValue = Math.max(0, parseInt(inputStr, 10) || 0)

  const handleOpen = (open: boolean) => {
    if (!open) {
      onClose()
      setMssAccepted(false)
    } else if (skin) {
      setInputStr(String(Math.round(skin.price)))
      setMssAccepted(false)
    }
  }

  const handleSlider = (val: number[]) => {
    if (!skin) return
    const newTry = Math.round(minTry + (val[0] / 100) * (listingTry - minTry))
    setInputStr(String(newTry))
  }

  const sliderPct = listingTry > minTry
    ? Math.max(0, Math.min(100, Math.round(((tryValue - minTry) / (listingTry - minTry)) * 100)))
    : 100

  const usdEquiv = listingTry > 0 && skin?.priceUsd
    ? (tryValue / listingTry) * skin.priceUsd
    : tryValue / 45.96

  const handleSend = async () => {
    if (!skin || sending) return
    if (!isLoggedIn || !steamProfile?.steamId) {
      toast.error(t("offer.loginRequired"))
      return
    }
    if (!profileComplete) {
      openProfileCompletion()
      return
    }
    if (!tradeUrl?.trim()) {
      toast.error(t("offer.tradeUrlRequired"), { description: t("offer.tradeUrlRequiredDesc") })
      return
    }
    if (!mssAccepted) {
      toast.error(t("checkout.mssRequired"))
      return
    }

    const finalTry = Math.max(0, parseInt(inputStr, 10) || 0)
    if (finalTry < minTry) {
      toast.error(t("offer.tooLow", { min: fmt(minTry) }))
      return
    }
    if (finalTry > listingTry) {
      toast.error(t("offer.tooHigh", { max: fmt(listingTry) }))
      return
    }

    setSending(true)
    const result = await sendOffer(
      {
        id: skin.id,
        type: skin.type,
        title: skin.title,
        img: skin.img,
        price: skin.price,
        listingId: skin.listingId,
      },
      finalTry,
      mssAccepted,
    )
    setSending(false)

    if (!result.offer) {
      toast.error(t("offer.sendFailed"), {
        description: offerErrorMessage(result.error, t),
      })
      return
    }

    toast.success(t("offer.sent"), {
      description: `${skin.type} | ${skin.title} — ${fmt(finalTry)}`,
    })
    onClose()
  }

  if (!skin) return null

  return (
    <Dialog open={!!skin} onOpenChange={handleOpen}>
      <DialogContent className="border-border bg-card sm:max-w-sm" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
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
          <img
            src={skin.img || "/placeholder.svg"}
            alt={skin.title}
            className="max-h-full max-w-[70%] object-contain drop-shadow"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="space-y-4 py-1">
          <div className="flex items-center justify-between rounded-lg border border-border bg-input px-3 py-2 text-sm">
            <span className="text-muted-foreground">{t("offer.listingPrice")}</span>
            <div className="flex flex-col items-end">
              <span className="font-bold text-foreground">{formatPrice(skin.price)}</span>
              <span className="text-[10px] text-muted-foreground/60">{formatUSD(skin.price)}</span>
            </div>
          </div>

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
                  value={inputStr}
                  onChange={(e) => setInputStr(e.target.value)}
                  onBlur={(e) => {
                    const v = parseInt(e.target.value, 10) || minTry
                    setInputStr(String(Math.min(listingTry, Math.max(minTry, v))))
                  }}
                  className={`border-input bg-input pl-7 text-foreground ${tryValue > listingTry ? "border-destructive focus-visible:ring-destructive" : "border-border"}`}
                />
              </div>
              <span className="min-w-[64px] text-right text-[11px] text-muted-foreground">
                ≈ {formatUSD(usdEquiv)}
              </span>
            </div>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[Math.max(0, Math.min(100, sliderPct))]}
              onValueChange={handleSlider}
              className="mt-1"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{t("offer.min")} {fmt(minTry)} (%60)</span>
              <span>{t("offer.max")} {fmt(listingTry)} (%100)</span>
            </div>
            {tryValue > listingTry && (
              <p className="text-[11px] font-semibold text-destructive">
                {t("offer.tooHigh", { max: fmt(listingTry) })}
              </p>
            )}
          </div>

          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <Checkbox checked={mssAccepted} onCheckedChange={(v) => setMssAccepted(v === true)} className="mt-0.5" />
            <span>
              {t("checkout.mssPrefix")}{" "}
              <Link href="/on-bilgilendirme-formu" target="_blank" className="text-primary hover:underline">
                {t("checkout.preInfoLink")}
              </Link>{" "}
              {t("checkout.mssAnd")}{" "}
              <Link href="/mesafeli-satis-sozlesmesi" target="_blank" className="text-primary hover:underline">
                {t("checkout.mssLink")}
              </Link>
              {t("checkout.mssSuffix")}
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSend}
            disabled={sending || tryValue < minTry || tryValue > listingTry || !mssAccepted}
            className="w-full bg-primary font-bold uppercase tracking-wide text-primary-foreground hover:bg-primary/90"
          >
            <Handshake className="mr-2 h-4 w-4" />
            {sending ? t("offer.sending") : `${t("offer.send")} — ${fmt(tryValue)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
