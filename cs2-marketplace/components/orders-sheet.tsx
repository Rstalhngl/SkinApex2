"use client"

import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
  SheetDescription, SheetTrigger,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { OrdersPanel } from "@/components/orders-panel"
import { PackageCheck } from "lucide-react"
import { useI18n } from "@/lib/i18n"

export function OrdersSheet({ trigger }: { trigger?: React.ReactNode }) {
  const { t } = useI18n()

  return (
    <Sheet>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent className="flex w-full flex-col gap-0 border-border bg-card p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <PackageCheck className="h-5 w-5 text-primary" />
            {t("orders.title")}
          </SheetTitle>
          <SheetDescription className="sr-only">{t("orders.title")}</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <OrdersPanel />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
