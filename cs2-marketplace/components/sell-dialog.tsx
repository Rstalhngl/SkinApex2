"use client"

import { useState } from "react"
import { Tag } from "lucide-react"
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
import { type Skin, formatPrice } from "@/lib/skins"
import { useI18n } from "@/lib/i18n"

export function SellDialog({
  skin,
  onClose,
}: {
  skin: Skin | null
  onClose: () => void
}) {
  const { listForSale, delistSkin, listedSkins } = useMarket()
  const { t } = useI18n()
  const [price, setPrice] = useState(skin ? String(skin.price) : "")

  const isListed = skin ? listedSkins.includes(skin.id) : false

  const handleList = () => {
    if (!skin) return
    const val = parseFloat(price)
    if (isNaN(val) || val <= 0) return
    listForSale(skin, val)
    onClose()
  }

  const handleDelist = () => {
    if (!skin) return
    delistSkin(skin.id)
    onClose()
  }

  if (!skin) return null

  return (
    <Dialog open={!!skin} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="border-border bg-card sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Tag className="h-5 w-5 text-primary" />
            {isListed ? t("sell.delist") : t("sell.title")}
          </DialogTitle>
          <DialogDescription>
            {skin.type} | {skin.title} — {skin.exterior}
          </DialogDescription>
        </DialogHeader>

        <div className="my-2 flex h-32 items-center justify-center rounded-lg bg-input">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={skin.img || "/placeholder.svg"}
            alt={`${skin.type} | ${skin.title}`}
            className="max-h-full max-w-[75%] object-contain drop-shadow"
          />
        </div>

        {!isListed ? (
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="sell-price" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t("sell.price")}
              </Label>
              <Input
                id="sell-price"
                type="number"
                min={0.01}
                step={0.01}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="border-border bg-input text-foreground"
              />
              <p className="text-xs text-muted-foreground">
                {t("sell.marketRef")} {formatPrice(skin.price)}
              </p>
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm font-semibold text-success">
            {t("sell.alreadyListed")}
          </p>
        )}

        <DialogFooter>
          {isListed ? (
            <Button
              onClick={handleDelist}
              variant="destructive"
              className="w-full font-bold uppercase tracking-wide"
            >
              {t("sell.delist")}
            </Button>
          ) : (
            <Button
              onClick={handleList}
              disabled={!price || parseFloat(price) <= 0}
              className="w-full bg-primary font-bold uppercase tracking-wide text-primary-foreground hover:bg-primary/90"
            >
              {t("sell.list")} {price && parseFloat(price) > 0 ? `— ${formatPrice(parseFloat(price))}` : ""}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
