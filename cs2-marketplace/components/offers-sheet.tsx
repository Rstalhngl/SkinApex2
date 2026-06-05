"use client"

import { useEffect, useState } from "react"
import { Check, Handshake, X } from "lucide-react"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
  SheetDescription, SheetTrigger,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  getOffers, subscribeOffers, acceptOffer, rejectOffer, withdrawOffer,
  type Offer,
} from "@/lib/offers"
import { formatUSD } from "@/lib/skins"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const STATUS_CLASS: Record<string, string> = {
  pending:   "text-yellow-400",
  accepted:  "text-success",
  rejected:  "text-destructive",
  withdrawn: "text-muted-foreground",
}

function OfferRow({ offer }: { offer: Offer }) {
  const { t } = useI18n()
  const ratio = Math.round((offer.offerPrice / offer.listingPrice) * 100)
  return (
    <li className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-0">
      <div className="flex h-14 w-16 shrink-0 items-center justify-center rounded-md bg-input">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={offer.skinImg || "/placeholder.svg"} alt={offer.skinName}
          className="max-h-12 max-w-[85%] object-contain" referrerPolicy="no-referrer" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-foreground">{offer.skinName}</p>
        <p className="text-[11px] text-muted-foreground">{offer.fromName}</p>
        <p className="text-[10px] font-semibold text-primary">
          {formatUSD(offer.offerPrice)}
          <span className="ml-1 text-muted-foreground/60">({ratio}%)</span>
        </p>
        <p className={cn("text-[10px] font-bold", STATUS_CLASS[offer.status])}>
          {t(`offer.status.${offer.status}`)}
        </p>
      </div>
      {offer.status === "pending" && (
        <div className="flex flex-col gap-1">
          {offer.direction === "incoming" ? (
            <>
              <Button size="sm" className="h-7 bg-success px-2 text-[11px] text-white hover:bg-success/90"
                onClick={() => acceptOffer(offer.id)}>
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="destructive" className="h-7 px-2 text-[11px]"
                onClick={() => rejectOffer(offer.id)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] border-border"
              onClick={() => withdrawOffer(offer.id)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </li>
  )
}

export function OffersSheet({ trigger }: { trigger?: React.ReactNode }) {
  const { t } = useI18n()
  const [offers, setOffers] = useState<Offer[]>(() => getOffers())

  useEffect(() => {
    return subscribeOffers(() => setOffers([...getOffers()]))
  }, [])

  const incoming = offers.filter(o => o.direction === "incoming")
  const outgoing = offers.filter(o => o.direction === "outgoing")

  return (
    <Sheet>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent className="flex w-full flex-col gap-0 border-border bg-card p-0 sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <Handshake className="h-5 w-5 text-primary" />
            {t("offers.title")}
          </SheetTitle>
          <SheetDescription className="sr-only">Sayfa içeriği</SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="incoming" className="flex flex-1 flex-col overflow-hidden">
          <TabsList className="mx-5 mt-3 mb-1 grid grid-cols-2 bg-input">
            <TabsTrigger value="incoming">
              {t("offers.incoming")}
              {incoming.filter(o => o.status === "pending").length > 0 && (
                <span className="ml-1.5 rounded-full bg-primary px-1.5 py-px text-[10px] font-bold text-primary-foreground">
                  {incoming.filter(o => o.status === "pending").length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="outgoing">
              {t("offers.outgoing")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="incoming" className="flex-1 overflow-hidden mt-0">
            {incoming.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
                <Handshake className="h-10 w-10 opacity-30" />
                <p className="text-sm">{t("offers.noIncoming")}</p>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <ul>{incoming.map(o => <OfferRow key={o.id} offer={o} />)}</ul>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="outgoing" className="flex-1 overflow-hidden mt-0">
            {outgoing.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
                <Handshake className="h-10 w-10 opacity-30" />
                <p className="text-sm">{t("offers.noOutgoing")}</p>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <ul>{outgoing.map(o => <OfferRow key={o.id} offer={o} />)}</ul>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
