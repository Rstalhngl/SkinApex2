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

        <DialogFooter className="flex-col gap-3 sm:flex-col">
          <div className="flex w-full gap-2">
            <Button
              onClick={handleDeposit}
              className="flex-1 bg-success font-bold uppercase tracking-wide text-white hover:bg-success/90"
            >
              {t("deposit.button")} {amount && Number.parseFloat(amount) > 0 ? formatPrice(Number.parseFloat(amount)) : ""}
            </Button>
            {/* Payment logos */}
            <div className="flex items-center gap-1.5">
              {/* Visa */}
              <div className="flex h-9 w-12 items-center justify-center rounded-md border border-border/60 bg-white">
                <svg viewBox="0 0 780 500" xmlns="http://www.w3.org/2000/svg" className="h-4 w-auto">
                  <path d="M293.2 348.7l33.4-195.4h53.4l-33.4 195.4H293.2zM543.8 157.4c-10.6-3.9-27.1-8.1-47.8-8.1-52.7 0-89.8 26.5-90.1 64.5-.3 28.1 26.6 43.8 46.9 53.1 20.8 9.6 27.8 15.7 27.7 24.2-.1 13.1-16.6 19.1-32 19.1-21.4 0-32.8-3-50.3-10.3l-6.9-3.1-7.5 43.7c12.5 5.5 35.5 10.3 59.5 10.5 56.1 0 92.5-26.3 92.9-67 .2-22.3-14.1-39.3-44.9-53.3-18.7-9.1-30.2-15.1-30.1-24.3 0-8.1 9.7-16.8 30.7-16.8 17.5-.3 30.2 3.5 40.1 7.5l4.8 2.3 7.3-43.1zM660.6 153.3h-41.2c-12.8 0-22.3 3.5-27.9 16.2l-79.2 179.6h56.1s9.2-24.2 11.2-29.5c6.1 0 60.5.1 68.3.1 1.6 6.9 6.5 29.5 6.5 29.5h49.6L660.6 153.3zm-65.9 124.5c4.4-11.3 21.3-54.7 21.3-54.7s4.4-11.4 7.1-18.8l3.6 17s10.2 46.7 12.3 56.5h-44.3zM232.5 153.3l-52.2 133.4-5.6-27.2c-9.7-31.3-39.8-65.2-73.5-82.1l47.8 171.3h56.5l84.1-195.4h-57.1z" fill="#1A1F71"/>
                  <path d="M131.7 153.3H45.3l-.7 3.9c67.1 16.3 111.5 55.7 129.9 103l-18.8-90.2c-3.2-12.4-12.6-16.3-24-16.7z" fill="#F9A533"/>
                </svg>
              </div>
              {/* Mastercard */}
              <div className="flex h-9 w-12 items-center justify-center rounded-md border border-border/60 bg-white">
                <svg viewBox="0 0 152 108" xmlns="http://www.w3.org/2000/svg" className="h-5 w-auto">
                  <circle cx="52" cy="54" r="44" fill="#EB001B"/>
                  <circle cx="100" cy="54" r="44" fill="#F79E1B"/>
                  <path d="M76 20.3C84.7 27.5 90 38.2 90 54C90 69.8 84.1 81.5 76 88.7C67.9 81.5 62 69.8 62 54C62 38.2 67.3 27.5 76 20.3Z" fill="#FF5F00"/>
                </svg>
              </div>
              {/* Bank Transfer / Havale */}
              <div className="flex h-9 w-14 items-center justify-center gap-1 rounded-md border border-border/60 bg-white px-1.5">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0">
                  <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 10v11M12 10v11M16 10v11" stroke="#1a56db" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-[9px] font-bold leading-tight text-[#1a56db]">HAVALE</span>
              </div>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
