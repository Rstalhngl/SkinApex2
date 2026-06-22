"use client"

import { useEffect, useState } from "react"
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
  const {
    withdrawableBalance,
    profileComplete,
    userProfile,
    openProfileCompletion,
    withdraw,
  } = useMarket()
  const { t } = useI18n()
  const [amount, setAmount] = useState("")
  const [iban, setIban] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [minWithdraw, setMinWithdraw] = useState(100)

  useEffect(() => {
    if (!open) return
    void fetch("/api/config")
      .then((r) => r.json())
      .then((d: { withdrawEnabled?: boolean; withdrawMin?: number }) => {
        setEnabled(Boolean(d.withdrawEnabled))
        if (typeof d.withdrawMin === "number") setMinWithdraw(d.withdrawMin)
      })
      .catch(() => setEnabled(false))
  }, [open])

  const withdrawTry = Math.round(withdrawableBalance * 100) / 100
  const reqAmount = parseFloat(amount) || 0
  const accountHolderName = [userProfile.firstName, userProfile.lastName].filter(Boolean).join(" ")
  const isValid =
    reqAmount > 0 &&
    reqAmount <= withdrawTry &&
    iban.replace(/\s/g, "").length >= 16 &&
    accountHolderName.length >= 4

  const handleWithdraw = async () => {
    if (!enabled) return
    if (!profileComplete) {
      openProfileCompletion()
      return
    }
    if (!isValid || submitting) return
    setSubmitting(true)
    const ok = await withdraw(reqAmount, iban, accountHolderName)
    setSubmitting(false)
    if (!ok) return
    toast.success(t("withdraw.success"), {
      description: t("withdraw.successDesc"),
    })
    onOpenChange(false)
    setAmount("")
    setIban("")
  }

  const loading = enabled === null
  const disabled = enabled === false

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Banknote className="h-5 w-5 text-primary" />
            {t("header.withdraw")}
          </DialogTitle>
          <DialogDescription>
            {disabled ? t("withdraw.disabled") : t("withdraw.title")}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">...</p>
        ) : disabled ? (
          <p className="rounded-lg border border-border bg-input p-4 text-sm text-muted-foreground">
            {t("withdraw.unavailableBody")}
          </p>
        ) : (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-border bg-input px-3 py-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("withdraw.withdrawable")}</span>
                <span className="font-bold text-success">{formatPrice(withdrawTry)}</span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">{t("withdraw.amlNote")}</p>
            </div>

            {!profileComplete && (
              <Button variant="outline" className="w-full" onClick={openProfileCompletion}>
                {t("profile.completeTitle")}
              </Button>
            )}

            <div className="space-y-2">
              <Label htmlFor="withdraw-amount" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t("withdraw.amountLabel")}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₺</span>
                <Input
                  id="withdraw-amount"
                  type="number"
                  min={minWithdraw}
                  max={withdrawTry}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="border-border bg-input pl-7 text-foreground"
                  placeholder="0"
                />
              </div>
              {reqAmount > withdrawTry && (
                <p className="text-[11px] text-destructive">{t("withdraw.tooHighWithdrawable")}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="iban" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t("withdraw.ibanLabel")}
              </Label>
              <Input
                id="iban"
                value={iban}
                onChange={(e) => setIban(e.target.value.toUpperCase())}
                className="border-border bg-input font-mono text-sm text-foreground"
                placeholder={t("withdraw.ibanPlaceholder")}
              />
            </div>

            {profileComplete && (
              <p className="text-[11px] text-muted-foreground">
                {t("withdraw.accountHolder")}: <strong className="text-foreground">{accountHolderName}</strong>
              </p>
            )}

            <p className="text-[11px] text-muted-foreground">
              {t("withdraw.infoDynamic", { min: String(minWithdraw) })}
            </p>
          </div>
        )}

        {!loading && !disabled && (
          <DialogFooter>
            <Button
              onClick={handleWithdraw}
              disabled={!isValid || reqAmount < minWithdraw || submitting || !profileComplete}
              className="w-full bg-primary font-bold uppercase tracking-wide text-primary-foreground hover:bg-primary/90"
            >
              <Banknote className="mr-2 h-4 w-4" />
              {submitting ? "..." : `${t("withdraw.submit")} ${amount && reqAmount > 0 ? `— ${fmt(reqAmount)}` : ""}`}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
