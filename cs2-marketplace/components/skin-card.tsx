"use client"

import { ExternalLink, Handshake, Heart, Tag, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMarket } from "@/components/market-provider"
import { type Skin, formatPrice, formatUSD, steamMarketUrl } from "@/lib/skins"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n"

export function SkinCard({
  skin,
  onInspect,
  onSell,
  onOffer,
  onDelist,
}: {
  skin: Skin
  onInspect: (skin: Skin) => void
  onSell?: (skin: Skin) => void
  onOffer?: (skin: Skin) => void
  onDelist?: (skin: Skin) => void
}) {
  const { addToCart, toggleWishlist, isWished, isInCart, listedSkins, steamProfile } = useMarket()
  const { t } = useI18n()
  const wished = isWished(skin.id)
  const inCart = isInCart(skin.id)
  const isOwned = skin.owner === "me"
  const isListed = listedSkins.includes(skin.id)
  const isMyListing = !!(
    skin.listingId &&
    skin.sellerId &&
    steamProfile?.steamId &&
    skin.sellerId === steamProfile.steamId
  )

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card p-4 transition-colors hover:border-[#243146] cursor-pointer"
      onClick={() => onInspect(skin)}
    >
      {skin.discount !== 0 && (
        <span
          className={cn(
            "absolute left-2 top-2 z-10 rounded px-1.5 py-0.5 text-[10px] font-bold",
            skin.discount < 0
              ? "bg-destructive/15 text-destructive"
              : "bg-success/15 text-success",
          )}
        >
          {skin.discount < 0 ? `+${Math.abs(skin.discount)}%` : `-${skin.discount}%`}
        </span>
      )}

      <div className={cn(
        "flex items-center justify-between text-[11px] text-muted-foreground",
        skin.discount !== 0 && "mt-5",
      )}>
        <span className="font-semibold">{skin.exterior}</span>
        <div className="flex items-center gap-1.5">
          {isOwned && (
            <span className={cn(
              "rounded px-1.5 py-0.5 font-bold text-[10px]",
              isListed
                ? "bg-success/15 text-success"
                : "bg-primary/15 text-primary",
            )}>
              {isListed ? t("sell.listedBadge") : t("sell.ownedBadge")}
            </span>
          )}
        </div>
      </div>

      {/* Weapon image with wear overlay */}
      <div className="relative my-2.5 flex h-[120px] items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={skin.img || "/placeholder.svg"}
          alt={`${skin.type} | ${skin.title}`}
          className="max-h-full max-w-[85%] object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        {/* Hover action buttons */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-card/95 px-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100" onClick={e => e.stopPropagation()}>
          {isMyListing ? (
            <Button
              onClick={() => onDelist?.(skin)}
              className="h-8 w-full min-w-0 max-w-full bg-destructive px-2 text-[10px] font-semibold leading-tight text-destructive-foreground hover:bg-destructive/90"
            >
              <XCircle className="mr-1 h-3 w-3 shrink-0" />
              <span className="truncate">{t("sell.unpublish")}</span>
            </Button>
          ) : isOwned ? (
            <div className="flex w-full gap-1.5">
              <Button
                onClick={() => onSell?.(skin)}
                className={cn(
                  "h-9 flex-1 text-xs font-bold uppercase tracking-wide",
                  isListed
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                <Tag className="mr-1 h-3.5 w-3.5" />
                {isListed ? t("sell.delist") : t("sell.list")}
              </Button>
            </div>
          ) : (
            <div className="flex w-full gap-1.5">
              <Button
                onClick={() => addToCart(skin)}
                className="h-9 flex-1 bg-primary text-xs font-bold uppercase tracking-wide text-primary-foreground hover:bg-primary/90"
              >
                {inCart ? t("card.inCart") : t("card.addToCart")}
              </Button>
              <button
                onClick={() => toggleWishlist(skin)}
                aria-label={t("card.toggleWishlist")}
                className={cn(
                  "flex h-9 w-12 items-center justify-center rounded-md border bg-input transition-colors",
                  wished ? "border-favorite" : "border-border hover:border-favorite",
                )}
              >
                <Heart className={cn("h-5 w-5", wished ? "fill-favorite text-favorite" : "text-muted-foreground")} />
              </button>
            </div>
          )}
          {/* Offer button — only for non-owned items */}
          {!isOwned && onOffer && (
            <button
              onClick={() => onOffer(skin)}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 py-1 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              <Handshake className="h-3 w-3" />
              {t("offer.makeOffer")}
            </button>
          )}
          {!isMyListing && (
            <a
              href={steamMarketUrl(skin.type, skin.title, skin.exterior, skin.hasFloat, skin.marketHashName)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-input py-1 text-[10px] font-semibold text-muted-foreground transition-colors hover:border-[#66c0f4] hover:text-[#66c0f4]"
              onClick={(e) => e.stopPropagation()}
            >
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
                <path d="M11.98 0C5.67 0 .5 4.87.02 11.06l6.43 2.66a3.4 3.4 0 0 1 1.92-.59l2.86-4.15v-.06a4.54 4.54 0 1 1 4.54 4.54h-.1l-4.08 2.92.01.4a3.41 3.41 0 0 1-6.76.66L.07 15.4C1.52 20.4 6.32 24 11.98 24 18.62 24 24 18.63 24 12S18.62 0 11.98 0z" />
              </svg>
              {t("card.viewOnMarket")}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      {/* Float bar */}
      {skin.hasFloat !== false && (
        <div className="mb-3">
          <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
            <span>{t("card.float")}</span>
            <strong className="text-foreground">{skin.float.toFixed(4)}</strong>
          </div>
          <div className="relative h-1 rounded-full bg-[linear-gradient(90deg,#3b82f6_0%,#10b981_20%,#eab308_40%,#f97316_70%,#ef4444_100%)]">
            <span
              className="absolute -top-0.5 h-2 w-1 rounded-sm bg-white shadow-[0_0_4px_#000]"
              style={{ left: `${Math.min(skin.float * 100, 98)}%` }}
            />
          </div>
        </div>
      )}

      {/* Stickers */}
      <div className="mb-3 flex min-h-5 gap-1">
        {skin.stickers.map((sticker, i) => (
          <span
            key={i}
            className="flex h-[22px] w-[22px] items-center justify-center rounded border border-primary/20 bg-primary/[0.08]"
            title={sticker.name}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sticker.img}
              alt={sticker.name}
              className="h-[18px] w-[18px] object-contain"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          </span>
        ))}
      </div>

      {/* Info footer */}
      <div className="mt-auto">
        <div className="mb-1 flex min-h-[15px] gap-1">
          {skin.isST && (
            <span className="rounded border border-stattrak/30 bg-stattrak/15 px-1 py-px text-[9px] font-extrabold text-stattrak">
              StatTrak™
            </span>
          )}
          {skin.isSV && (
            <span className="rounded border border-souvenir/30 bg-souvenir/15 px-1 py-px text-[9px] font-extrabold text-souvenir">
              Souvenir
            </span>
          )}
        </div>
        <div className="flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground">
          <span>{skin.type}</span>
          <div className="flex items-center gap-1">
            {skin.phase && (
              <span className="rounded bg-primary/20 px-1 py-px text-[9px] font-bold text-primary">{skin.phase}</span>
            )}
            {skin.patternSeed !== undefined && skin.hasFloat !== false && (
              <span className="rounded bg-border px-1 py-px text-[9px] text-muted-foreground">#{skin.patternSeed}</span>
            )}
          </div>
        </div>
        <div className="truncate text-sm font-semibold text-foreground">{skin.title}</div>
        <div className="mt-2.5 flex items-baseline justify-between border-t border-border pt-2">
          <span className="text-[11px] text-muted-foreground line-through">{formatPrice(skin.oldPrice)}</span>
          <div className="flex flex-col items-end">
            <span className="text-sm font-bold text-success">{formatPrice(skin.price)}</span>
            {skin.hasFloat !== false && (
              <span className="text-[10px] text-muted-foreground/60">{formatUSD(skin.priceUsd ?? skin.price)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
