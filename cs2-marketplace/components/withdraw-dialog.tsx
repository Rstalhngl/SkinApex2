"use client"

import { useState } from "react"
import { Banknote } from "lucide-react"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useMarket } from "@/components/market-provider"
import { formatPrice } from "@/lib/skins"
import { useI18n } from "@/lib/i18n"
import { toast } from "sonner"

const fmt = (v: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(v)

export function WithdrawDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { wallet, withdraw } = useMarket()
  const { t } = useI18n()
  const [amount, setAmount] = useState("")
  const [iban, setIban] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const walletTry = Math.round(wallet * 100) / 100
  const reqAmount = parseFloat(amount) || 0
  const trimmedFirstName = firstName.trim()
  const trimmedLastName = lastName.trim()
  const isValid =
    reqAmount > 0 &&
    reqAmount <= walletTry &&
    iban.replace(/\s/g, "").length >= 16 &&
    trimmedFirstName.length >= 2 &&
    trimmedLastName.length >= 2

  const handleWithdraw = async () => {
    if (!isValid || submitting) return
    setSubmitting(true)
    const ok = await withdraw(reqAmount)
    setSubmitting(false)
    if (!ok) {
      toast.error(t("withdraw.failed"))
      return
    }
    toast.success(t("withdraw.success"), {
      description: t("withdraw.successDesc"),
    })
    onOpenChange(false)
    setAmount("")
    setIban("")
    setFirstName("")
    setLastName("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Banknote className="h-5 w-5 text-primary" />
            {t("header.withdraw")}
          </DialogTitle>
          <DialogDescription>
            {t("withdraw.title")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between rounded-lg border border-border bg-input px-3 py-2 text-sm">
            <span className="text-muted-foreground">{t("withdraw.balance")}</span>
            <span className="font-bold text-success">{formatPrice(walletTry)}</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="withdraw-amount" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Çekilecek Tutar (TL)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₺</span>
              <Input
                id="withdraw-amount"
                type="number"
                min={1}
                max={walletTry}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="border-border bg-input pl-7 text-foreground"
                placeholder="0"
              />
            </div>
            {reqAmount > walletTry && (
              <p className="text-[11px] text-destructive">{t("withdraw.tooHigh")}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="iban" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("withdraw.ibanLabel")}
            </Label>
            <Input
              id="iban"
              value={iban}
              onChange={e => setIban(e.target.value.toUpperCase())}
              className="border-border bg-input font-mono text-sm text-foreground"
              placeholder={t("withdraw.ibanPlaceholder")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="withdraw-first-name" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t("withdraw.firstNameLabel")}
              </Label>
              <Input
                id="withdraw-first-name"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className="border-border bg-input text-foreground"
                placeholder={t("withdraw.firstNamePlaceholder")}
                autoComplete="given-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="withdraw-last-name" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t("withdraw.lastNameLabel")}
              </Label>
              <Input
                id="withdraw-last-name"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className="border-border bg-input text-foreground"
                placeholder={t("withdraw.lastNamePlaceholder")}
                autoComplete="family-name"
              />
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            {t("withdraw.info")}
          </p>
        </div>

        <DialogFooter>
          <Button
            onClick={handleWithdraw}
            disabled={!isValid || reqAmount < 500 || submitting}
            className="w-full bg-primary font-bold uppercase tracking-wide text-primary-foreground hover:bg-primary/90"
          >
            <Banknote className="mr-2 h-4 w-4" />
            {submitting ? "..." : `Para Çek ${amount && reqAmount > 0 ? `— ${fmt(reqAmount)}` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
