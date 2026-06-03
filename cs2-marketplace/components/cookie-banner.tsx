"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Cookie, Settings, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

const CONSENT_KEY = "skx_cookie_consent_v1"

export interface CookieConsent {
  necessary: true       // always on
  analytics: boolean
  marketing: boolean
  ts: number
}

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveConsent(analytics: boolean, marketing: boolean) {
  const consent: CookieConsent = {
    necessary: true,
    analytics,
    marketing,
    ts: Date.now(),
  }
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent))
  return consent
}

export function CookieBanner() {
  const [show, setShow] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [marketing, setMarketing] = useState(false)

  useEffect(() => {
    const consent = getCookieConsent()
    if (!consent) setShow(true)
  }, [])

  const acceptAll = () => {
    saveConsent(true, true)
    setShow(false)
  }

  const rejectAll = () => {
    saveConsent(false, false)
    setShow(false)
  }

  const saveSettings = () => {
    saveConsent(analytics, marketing)
    setSettingsOpen(false)
    setShow(false)
  }

  if (!show) return null

  return (
    <>
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md shadow-[0_-4px_32px_rgba(0,0,0,0.4)]">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:gap-6 md:px-10">
          <div className="flex items-start gap-3 flex-1">
            <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Çerez Bildirimi — </span>
              Sitemizde deneyiminizi iyileştirmek için zorunlu ve isteğe bağlı çerezler kullanıyoruz.{" "}
              <Link href="/cerez-politikasi" className="text-primary underline-offset-2 hover:underline">
                Çerez Politikası
              </Link>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-border bg-input text-foreground hover:bg-card"
              onClick={() => {
                const c = getCookieConsent()
                setAnalytics(c?.analytics ?? false)
                setMarketing(c?.marketing ?? false)
                setSettingsOpen(true)
              }}
            >
              <Settings className="mr-1.5 h-3.5 w-3.5" />
              Ayarlar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-border bg-input text-foreground hover:bg-card"
              onClick={rejectAll}
            >
              Hepsini Reddet
            </Button>
            <Button
              size="sm"
              className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
              onClick={acceptAll}
            >
              Hepsini Kabul Et
            </Button>
          </div>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="border-border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Cookie className="h-5 w-5 text-primary" />
              Çerez Tercihleri
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            {/* Necessary */}
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-input p-3">
              <div>
                <p className="font-semibold text-foreground">Zorunlu Çerezler</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Sitenin çalışması için gereklidir. Devre dışı bırakılamaz. Steam girişi, oturum ve güvenlik çerezlerini kapsar.
                </p>
              </div>
              <Switch checked disabled className="mt-0.5 shrink-0 opacity-60" />
            </div>

            {/* Analytics */}
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
              <div>
                <Label htmlFor="analytics-switch" className="font-semibold text-foreground cursor-pointer">
                  Analitik Çerezler
                </Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Ziyaretçi istatistikleri ve kullanım analizleri için kullanılır (ör. Vercel Analytics).
                </p>
              </div>
              <Switch
                id="analytics-switch"
                checked={analytics}
                onCheckedChange={setAnalytics}
                className="mt-0.5 shrink-0"
              />
            </div>

            {/* Marketing */}
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
              <div>
                <Label htmlFor="marketing-switch" className="font-semibold text-foreground cursor-pointer">
                  Pazarlama Çerezleri
                </Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Kişiselleştirilmiş içerik ve reklam gösterimi için kullanılır.
                </p>
              </div>
              <Switch
                id="marketing-switch"
                checked={marketing}
                onCheckedChange={setMarketing}
                className="mt-0.5 shrink-0"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1 border-border"
              onClick={() => { setAnalytics(false); setMarketing(false); saveSettings() }}
            >
              Hepsini Reddet
            </Button>
            <Button
              className="flex-1 bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
              onClick={saveSettings}
            >
              Tercihleri Kaydet
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
