"use client"

import { liveSalesPool } from "@/lib/skins"
import { useI18n } from "@/lib/i18n"

export function LiveTicker() {
  const { t } = useI18n()
  const items = [...liveSalesPool, ...liveSalesPool]

  return (
    <div className="flex items-center gap-4 border-b border-border bg-[#030712] px-4 py-2 md:px-[4%]">
      <div className="flex shrink-0 items-center gap-1.5 rounded bg-success/15 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-success">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
        </span>
        {t("live.title")}
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div className="flex w-max animate-ticker gap-10">
          {items.map((sale, i) => (
            <span key={i} className="whitespace-nowrap text-xs text-foreground">
              <strong className="font-semibold text-primary">{sale.item}</strong>{" "}
              <span className="text-muted-foreground">{t(`live.${sale.action}`)}</span>{" "}
              <span className="font-bold text-success">{sale.price}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
