"use client"

import { useState } from "react"
import { CheckCircle2, ExternalLink, Link } from "lucide-react"
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
import { isValidTradeUrl } from "@/lib/trade-url"
import { toast } from "sonner"

export function TradeUrlDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { tradeUrl, setTradeUrl } = useMarket()
  const { t } = useI18n()
  const [value, setValue] = useState(tradeUrl)

  const isValid = isValidTradeUrl(value)

  const handleSave = () => {
    if (!isValid) {
      toast.error(t("tradeUrl.invalid"), { description: t("tradeUrl.invalidDesc") })
      return
    }
    setTradeUrl(value.trim())
    toast.success(t("tradeUrl.saved"), { description: t("tradeUrl.savedDesc") })
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) setValue(tradeUrl)
        onOpenChange(o)
      }}
    >
      <DialogContent className="border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Link className="h-5 w-5 text-primary" />
            {t("tradeUrl.title")}
          </DialogTitle>
          <DialogDescription>{t("tradeUrl.desc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="trade-url" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("tradeUrl.label")}
            </Label>
            <Input
              id="trade-url"
              type="url"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t("tradeUrl.placeholder")}
              className="border-border bg-input text-foreground text-xs"
            />
            {value.trim().length > 0 && (
              <p
                className={`flex items-center gap-1 text-xs ${
                  isValid ? "text-success" : "text-destructive"
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {isValid ? t("tradeUrl.validFormat") : t("tradeUrl.invalidFormat")}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-input p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">{t("tradeUrl.howTitle")}</p>
            <p>{t("tradeUrl.howStep1")}</p>
            <p>{t("tradeUrl.howStep2")}</p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            asChild
            className="w-full border-border sm:w-auto"
          >
            <a
              href="https://steamcommunity.com/my/tradeoffers/privacy#trade_offer_access_url"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              {t("tradeUrl.openSteam")}
            </a>
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValid}
            className="w-full bg-primary font-bold uppercase tracking-wide text-primary-foreground hover:bg-primary/90 sm:w-auto"
          >
            {t("tradeUrl.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
