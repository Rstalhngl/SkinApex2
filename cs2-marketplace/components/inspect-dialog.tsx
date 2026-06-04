"use client"

import { CheckCircle2, ExternalLink, Handshake, Heart } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { useMarket } from "@/components/market-provider"
import { type Skin, formatPrice, formatUSD, steamMarketUrl } from "@/lib/skins"
import { OfferDialog } from "@/components/offer-dialog"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n"

export function InspectDialog({
  skin,
  onClose,
}: {
  skin: Skin | null
  onClose: () => void
}) {
  const { addToCart, toggleWishlist, isWished } = useMarket()
  const { t } = useI18n()
  const wished = skin ? isWished(skin.id) : false
  const [offerSkin, setOfferSkin] = useState<Skin | null>(null)

  return (
    <>
    <Dialog open={!!skin} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-border bg-card sm:max-w-lg">
        {skin && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-foreground">
                {skin.isST ? "StatTrak™ " : ""}
                {skin.type} | {skin.title}
              </DialogTitle>
              <DialogDescription className="text-xs uppercase tracking-wide">
                {t(`exterior.${skin.exterior}`)} • {t("inspect.popularity", { n: skin.popularity })}
              </DialogDescription>
            </DialogHeader>

            <div className="my-2 flex h-44 items-center justify-center rounded-lg bg-[radial-gradient(circle,rgba(56,189,248,0.08)_0%,transparent_70%)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={skin.img || "/placeholder.svg"}
                alt={`${skin.type} | ${skin.title}`}
                className="max-h-full max-w-[80%] object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
                referrerPolicy="no-referrer"
                onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }}
              />
            </div>

            <div className="space-y-2.5 rounded-lg border border-border bg-input p-4 text-sm">
              {skin.hasFloat !== false && (
                <Row label={t("inspect.floatValue")}>
                  <span className="font-bold text-primary">{skin.float.toFixed(4)}</span>
                </Row>
              )}
              <Row label={t("inspect.discountRate")}>
                {skin.discount < 0 ? (
                  <span className="font-bold text-destructive">+{Math.abs(skin.discount)}% {t("inspect.aboveMarket")}</span>
                ) : (
                  <span className="font-bold text-success">{t("inspect.off", { n: skin.discount })}</span>
                )}
              </Row>
              <Row label={t("inspect.listPrice")}>
                <span className="text-muted-foreground line-through">{formatPrice(skin.oldPrice)}</span>
              </Row>
              <Row label={t("inspect.yourPrice")}>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="font-bold text-success">{formatPrice(skin.price)}</span>
                  <span className="text-[10px] text-muted-foreground/70">{t("inspect.steamRef")} {formatUSD(skin.priceUsd ?? skin.price)}</span>
                </div>
              </Row>
              <Row label={t("inspect.delivery")}>
                <span className="flex items-center gap-1 font-bold text-success">
                  <CheckCircle2 className="h-4 w-4" /> {t("inspect.tradeable")}
                </span>
              </Row>
            </div>

            {/* Stickers */}
            {skin.stickers.length > 0 && (
              <div className="space-y-1.5 rounded-lg border border-border bg-input px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t("inspect.stickers")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {skin.stickers.map((sticker, i) => (
                    <span
                      key={i}
                      title={sticker.name}
                      className="flex h-9 w-9 items-center justify-center rounded-md border border-primary/20 bg-card"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={sticker.img}
                        alt={sticker.name}
                        className="h-7 w-7 object-contain"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Steam links */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="flex-1 border-border bg-input text-xs text-foreground hover:border-[#66c0f4] hover:text-[#66c0f4]"
              >
                <a
                  href={steamMarketUrl(skin.type, skin.title, skin.exterior, skin.hasFloat, skin.marketHashName)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg viewBox="0 0 24 24" className="mr-1.5 h-3.5 w-3.5" fill="currentColor">
                    <path d="M11.98 0C5.67 0 .5 4.87.02 11.06l6.43 2.66a3.4 3.4 0 0 1 1.92-.59l2.86-4.15v-.06a4.54 4.54 0 1 1 4.54 4.54h-.1l-4.08 2.92.01.4a3.41 3.41 0 0 1-6.76.66L.07 15.4C1.52 20.4 6.32 24 11.98 24 18.62 24 24 18.63 24 12S18.62 0 11.98 0z" />
                  </svg>
                  {t("inspect.viewMarket")}
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
              {skin.owner !== "me" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOfferSkin(skin)}
                  className="flex-1 border-primary/40 bg-primary/10 text-xs font-semibold text-primary hover:bg-primary/20"
                >
                  <Handshake className="mr-1.5 h-3.5 w-3.5" />
                  {t("offer.makeOffer")}
                </Button>
              )}
            </div>

            <div className="mt-2 flex gap-2">
              <Button
                onClick={() => {
                  addToCart(skin)
                  onClose()
                }}
                className="h-12 flex-1 bg-primary text-sm font-bold uppercase tracking-wide text-primary-foreground hover:bg-primary/90"
              >
                {t("inspect.lockAdd")}
              </Button>
              <Button
                variant="outline"
                onClick={() => toggleWishlist(skin)}
                aria-label={t("card.toggleWishlist")}
                className={cn(
                  "h-12 w-12 border-border bg-input p-0",
                  wished ? "border-favorite" : "hover:border-favorite",
                )}
              >
                <Heart className={cn("h-5 w-5", wished ? "fill-favorite text-favorite" : "text-muted-foreground")} />
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
    <OfferDialog skin={offerSkin} onClose={() => setOfferSkin(null)} />
    </>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}
