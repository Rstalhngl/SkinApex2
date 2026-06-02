"use client"

import { useState } from "react"
import { Wallet } from "lucide-react"
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
import { formatPrice } from "@/lib/skins"
import { useI18n } from "@/lib/i18n"

const PRESETS = [25, 50, 100, 250]

export function DepositDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { deposit } = useMarket()
  const { t } = useI18n()
  const [amount, setAmount] = useState("50")

  const handleDeposit = () => {
    const value = Number.parseFloat(amount)
    if (!Number.isNaN(value) && value > 0) {
      deposit(value)
      onOpenChange(false)
      setAmount("50")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Wallet className="h-5 w-5 text-success" />
            {t("deposit.title")}
          </DialogTitle>
          <DialogDescription>{t("deposit.desc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setAmount(String(preset))}
                className="rounded-md border border-border bg-input py-2 text-sm font-semibold text-foreground transition-colors hover:border-success hover:text-success"
              >
                {formatPrice(preset)}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="deposit-amount" className="text-xs uppercase text-muted-foreground">
              {t("deposit.custom")}
            </Label>
            <Input
              id="deposit-amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="border-border bg-input text-foreground"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleDeposit}
            className="w-full bg-success font-bold uppercase tracking-wide text-white hover:bg-success/90"
          >
            {t("deposit.button")} {amount && Number.parseFloat(amount) > 0 ? formatPrice(Number.parseFloat(amount)) : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
