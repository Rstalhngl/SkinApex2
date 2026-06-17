"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Gavel, RefreshCw, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch } from "@/lib/api-client"
import { formatPrice } from "@/lib/skins"
import type { Sale } from "@/lib/sale-types"
import { useMarket } from "@/components/market-provider"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Overview {
  totalSales: number
  pendingDelivery: number
  disputed: number
  delivered: number
  expired: number
  resolved: number
  activeUsers: number
  wsConnections: number
}

function StatCard({
  label,
  value,
  accent,
  hint,
}: {
  label: string
  value: number
  accent?: string
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold", accent ?? "text-foreground")}>{value}</p>
      {hint ? <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function DisputeCard({
  sale,
  onResolved,
}: {
  sale: Sale
  onResolved: () => void
}) {
  const { t } = useI18n()
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)

  const resolve = async (action: "buyer_refund" | "seller_paid") => {
    setBusy(true)
    try {
      const res = await apiFetch("/api/admin/disputes/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saleId: sale.id, action, note: note.trim() || undefined }),
      })
      if (!res.ok) {
        toast.error(t("admin.resolveFailed"))
        return
      }
      toast.success(t("admin.resolveSuccess"))
      onResolved()
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex gap-3">
        <div className="flex h-14 w-16 shrink-0 items-center justify-center rounded-md bg-input">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sale.itemImg || "/placeholder.svg"}
            alt={sale.itemName}
            className="max-h-12 max-w-[85%] object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{sale.itemName}</p>
          <p className="text-xs text-muted-foreground">
            {sale.id} · {formatPrice(sale.priceTry)}
          </p>
          <p className="mt-1 text-xs">
            <span className="text-muted-foreground">{t("orders.buyer")}:</span> {sale.buyerName}
            <span className="mx-2 text-border">|</span>
            <span className="text-muted-foreground">{t("orders.seller")}:</span> {sale.sellerName}
          </p>
          {sale.buyerTradeUrl && (
            <a
              href={sale.buyerTradeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-[11px] text-primary hover:underline"
            >
              {t("orders.buyerTradeUrl")}
            </a>
          )}
          {sale.disputedAt && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              {new Date(sale.disputedAt).toLocaleString("tr-TR")}
            </p>
          )}
        </div>
      </div>

      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t("admin.notePlaceholder")}
        className="mt-3 min-h-[60px] border-border bg-input text-sm"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={busy}
          className="bg-success text-white hover:bg-success/90"
          onClick={() => resolve("buyer_refund")}
        >
          {t("admin.refundBuyer")}
        </Button>
        <Button
          size="sm"
          disabled={busy}
          variant="outline"
          className="border-primary text-primary"
          onClick={() => resolve("seller_paid")}
        >
          {t("admin.paySeller")}
        </Button>
      </div>
    </li>
  )
}

export function AdminPanel() {
  const { t } = useI18n()
  const { isLoggedIn } = useMarket()
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [disputes, setDisputes] = useState<Sale[]>([])

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true)
    try {
      const meRes = await apiFetch("/api/admin/me")
      const me = await meRes.json()
      if (!me.isAdmin) {
        setAllowed(false)
        return
      }
      setAllowed(true)
      const [ovRes, dispRes] = await Promise.all([
        apiFetch("/api/admin/overview"),
        apiFetch("/api/admin/disputes"),
      ])
      const ovData = await ovRes.json()
      const dispData = await dispRes.json()
      setOverview(ovData.overview ?? null)
      setDisputes(Array.isArray(dispData.disputes) ? dispData.disputes : [])
    } finally {
      if (!options?.silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isLoggedIn) void load()
    else {
      setLoading(false)
      setAllowed(false)
    }
  }, [isLoggedIn, load])

  useEffect(() => {
    if (!allowed) return
    const interval = setInterval(() => void load({ silent: true }), 30_000)
    return () => clearInterval(interval)
  }, [allowed, load])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
        {t("admin.loading")}
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
        <Shield className="h-12 w-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("admin.loginRequired")}</p>
        <Link href="/" className="text-sm text-primary hover:underline">{t("admin.backHome")}</Link>
      </div>
    )
  }

  if (!allowed) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
        <Shield className="h-12 w-12 text-destructive" />
        <p className="font-semibold text-foreground">{t("admin.forbidden")}</p>
        <p className="text-sm text-muted-foreground">{t("admin.forbiddenDesc")}</p>
        <Link href="/" className="text-sm text-primary hover:underline">{t("admin.backHome")}</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Gavel className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">{t("admin.title")}</h1>
              <p className="text-sm text-muted-foreground">{t("admin.subtitle")}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="mr-1 h-4 w-4" />
              {t("admin.refresh")}
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="mr-1 h-4 w-4" />
                {t("admin.backHome")}
              </Link>
            </Button>
          </div>
        </div>

        {overview && (
          <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            <StatCard
              label={t("admin.stat.activeUsers")}
              value={overview.activeUsers}
              accent="text-primary"
              hint={t("admin.stat.activeUsersDetail", { ws: overview.wsConnections })}
            />
            <StatCard label={t("admin.stat.total")} value={overview.totalSales} />
            <StatCard label={t("admin.stat.pending")} value={overview.pendingDelivery} accent="text-yellow-400" />
            <StatCard label={t("admin.stat.disputed")} value={overview.disputed} accent="text-primary" />
            <StatCard label={t("admin.stat.delivered")} value={overview.delivered} accent="text-success" />
            <StatCard label={t("admin.stat.expired")} value={overview.expired} accent="text-destructive" />
            <StatCard label={t("admin.stat.resolved")} value={overview.resolved} />
          </div>
        )}

        <section>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {t("admin.disputesTitle")} ({disputes.length})
          </h2>
          {disputes.length === 0 ? (
            <p className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
              {t("admin.noDisputes")}
            </p>
          ) : (
            <ul className="space-y-4">
              {disputes.map((sale) => (
                <DisputeCard key={sale.id} sale={sale} onResolved={load} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
