"use client"

import { useEffect, useState } from "react"
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
import { useI18n } from "@/lib/i18n"

const PRESETS = [1000, 5000, 10000, 20000]

export function DepositDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { deposit } = useMarket()
  const { t } = useI18n()
  const [amount, setAmount] = useState("1000")
  const [enabled, setEnabled] = useState<boolean | null>(null)

  useEffect(() => {
    if (!open) return
    void fetch("/api/config")
      .then((r) => r.json())
      .then((d: { demoDeposits?: boolean }) => setEnabled(Boolean(d.demoDeposits)))
      .catch(() => setEnabled(false))
  }, [open])

  const handleDeposit = async () => {
    const value = Number.parseFloat(amount)
    if (!Number.isNaN(value) && value > 0) {
      await deposit(value)
      onOpenChange(false)
      setAmount("1000")
    }
  }

  const loading = enabled === null
  const disabled = enabled === false

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Wallet className="h-5 w-5 text-success" />
            {t("deposit.title")}
          </DialogTitle>
          <DialogDescription>
            {disabled ? t("deposit.disabled") : t("deposit.desc")}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">...</p>
        ) : disabled ? (
          <p className="rounded-lg border border-border bg-input p-4 text-sm text-muted-foreground">
            {t("deposit.unavailableBody")}
          </p>
        ) : (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-4 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setAmount(String(preset))}
                  className="rounded-md border border-border bg-input py-2 text-sm font-semibold text-foreground transition-colors hover:border-success hover:text-success"
                >
                  {new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(preset)}
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
                min={100}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="border-border bg-input text-foreground"
              />
            </div>
          </div>
        )}

        {!loading && !disabled && (
          <DialogFooter>
            <Button
              onClick={handleDeposit}
              className="w-full bg-success font-bold uppercase tracking-wide text-white hover:bg-success/90"
            >
              {t("deposit.button")} {amount && Number.parseFloat(amount) > 0 ? new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(Number.parseFloat(amount)) : ""}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
