"use client"

import { Heart } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useMarket } from "@/components/market-provider"
import { formatPrice } from "@/lib/skins"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n"

export function WishlistSheet() {
  const { wishlist, toggleWishlist, addToCart, items } = useMarket()
  const { t } = useI18n()
  const wishedItems = items.filter((s) => wishlist.includes(s.id))

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className={cn(
            "group relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-input transition-colors hover:border-favorite/40",
            wishlist.length > 0 && "border-favorite/40",
          )}
          aria-label={t("header.openWishlist")}
        >
          <Heart
            className={cn(
              "h-[18px] w-[18px] transition-colors",
              wishlist.length > 0
                ? "fill-favorite text-favorite"
                : "text-muted-foreground group-hover:fill-favorite group-hover:text-favorite",
            )}
          />
          {wishlist.length > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-favorite px-1 text-[10px] font-extrabold text-white">
              {wishlist.length}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 border-border bg-card p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <Heart className="h-5 w-5 fill-favorite text-favorite" />
            {t("wishlist.title")}
            <span className="text-sm font-normal text-muted-foreground">({wishedItems.length})</span>
          </SheetTitle>
          <SheetDescription className="sr-only">{t("wishlist.savedDesc")}</SheetDescription>
        </SheetHeader>

        {wishedItems.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <Heart className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("wishlist.empty")}</p>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <ul className="divide-y divide-border">
              {wishedItems.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex h-14 w-16 shrink-0 items-center justify-center rounded-md bg-input">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.img || "/placeholder.svg"}
                      alt={`${item.type} ${item.title}`}
                      className="max-h-12 max-w-[85%] object-contain"
                      crossOrigin="anonymous"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      {item.type}
                    </p>
                    <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                    <span className="font-bold text-success">{formatPrice(item.price)}</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Button
                      size="sm"
                      onClick={() => addToCart(item)}
                      className="h-7 bg-primary px-2 text-[11px] font-bold uppercase text-primary-foreground hover:bg-primary/90"
                    >
                      {t("wishlist.add")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleWishlist(item)}
                      className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                    >
                      {t("wishlist.remove")}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  )
}
