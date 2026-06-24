"use client"

import { useMarket } from "@/components/market-provider"
import { useI18n } from "@/lib/i18n"
import { formatPrice } from "@/lib/skins"
import { cn } from "@/lib/utils"

interface WalletBalanceProps {
  amount: number
  className?: string
  /** Stop click from bubbling (e.g. inside dropdown triggers). */
  stopPropagation?: boolean
}

export function WalletBalance({
  amount,
  className,
  stopPropagation = false,
}: WalletBalanceProps) {
  const { balanceHidden, toggleBalanceHidden } = useMarket()
  const { t } = useI18n()

  return (
    <button
      type="button"
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation()
        toggleBalanceHidden()
      }}
      className={cn(
        "inline cursor-pointer rounded-sm text-left transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        className,
      )}
      aria-label={balanceHidden ? t("wallet.showBalance") : t("wallet.hideBalance")}
      title={balanceHidden ? t("wallet.showBalance") : t("wallet.hideBalance")}
    >
      {balanceHidden ? "****" : formatPrice(amount)}
    </button>
  )
}
