"use client"

import { useState } from "react"
import { ShoppingCart, Trash2, X } from "lucide-react"
import { CheckoutDialog } from "@/components/checkout-dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useMarket } from "@/components/market-provider"
import { formatPrice } from "@/lib/skins"
import { cn } from "@/lib/utils"
import { LoginGate } from "@/components/login-gate"
import { useI18n } from "@/lib/i18n"

export function CartSheet() {
  const { cart, cartTotal, removeFromCart, wallet, isLoggedIn } = useMarket()
  const { t } = useI18n()
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const insufficient = cartTotal > wallet

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-input text-foreground transition-colors hover:border-primary"
          aria-label={t("header.openCart")}
        >
          <ShoppingCart className="h-[18px] w-[18px]" />
          {cart.length > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-extrabold text-primary-foreground">
              {cart.length}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 border-border bg-card p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <ShoppingCart className="h-5 w-5 text-primary" />
            {t("cart.title")}
            <span className="text-sm font-normal text-muted-foreground">({cart.length})</span>
          </SheetTitle>
          <SheetDescription className="sr-only">{t("cart.itemsDesc")}</SheetDescription>
        </SheetHeader>

        {!isLoggedIn ? <LoginGate /> : cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <ShoppingCart className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("cart.empty")}</p>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <ul className="divide-y divide-border">
              {cart.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex h-14 w-16 shrink-0 items-center justify-center rounded-md bg-input">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.img || "/placeholder.svg"}
                      alt={`${item.type} ${item.title}`}
                      className="max-h-12 max-w-[85%] object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      {item.type}
                    </p>
                    <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.exterior}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-bold text-success">{formatPrice(item.price)}</span>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                      aria-label={t("cart.removeItem")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}

        <SheetFooter className="border-t border-border px-5 py-4">
          <div className="w-full space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("cart.wallet")}</span>
              <span className="font-semibold text-foreground">{formatPrice(wallet)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("cart.total")}</span>
              <span className="text-lg font-bold text-success">{formatPrice(cartTotal)}</span>
            </div>
            {insufficient && cart.length > 0 && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <X className="h-3.5 w-3.5" /> {t("cart.insufficient")}
              </p>
            )}
            <Button
              onClick={() => setCheckoutOpen(true)}
              disabled={cart.length === 0}
              className={cn(
                "w-full font-bold uppercase tracking-wide",
                "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              {t("cart.checkout")}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
      <CheckoutDialog open={checkoutOpen} onOpenChange={setCheckoutOpen} />
    </Sheet>
  )
}
