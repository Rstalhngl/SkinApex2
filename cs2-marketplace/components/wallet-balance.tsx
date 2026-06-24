"use client"

import { useMarket } from "@/components/market-provider"
import { useI18n } from "@/lib/i18n"
import { formatPrice } from "@/lib/skins"
import { cn } from "@/lib/utils"

interface WalletBalanceProps {
  amount: number
  className?: string
  /** Inside dropdown/menu triggers — block parent open on balance click. */
  isolated?: boolean
}

export function WalletBalance({
  amount,
  className,
  isolated = false,
}: WalletBalanceProps) {
  const { balanceHidden, toggleBalanceHidden } = useMarket()
  const { t } = useI18n()

  const toggle = () => toggleBalanceHidden()

  const stopParent = (e: React.SyntheticEvent) => {
    if (!isolated) return
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onPointerDown={stopParent}
      onMouseDown={stopParent}
      onClick={(e) => {
        stopParent(e)
        toggle()
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return
        e.preventDefault()
        if (isolated) e.stopPropagation()
        toggle()
      }}
      className={cn(
        "inline cursor-pointer select-none rounded-sm text-left transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        className,
      )}
      aria-label={balanceHidden ? t("wallet.showBalance") : t("wallet.hideBalance")}
      title={balanceHidden ? t("wallet.showBalance") : t("wallet.hideBalance")}
    >
      {balanceHidden ? "****" : formatPrice(amount)}
    </span>
  )
}
