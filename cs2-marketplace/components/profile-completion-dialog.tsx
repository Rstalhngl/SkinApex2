"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { UserCircle } from "lucide-react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { patchUserData } from "@/lib/user-data-client"
import { useI18n } from "@/lib/i18n"
import { toast } from "sonner"

export function ProfileCompletionDialog({
  open,
  onOpenChange,
  onCompleted,
  initial,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCompleted: () => void
  initial?: { firstName?: string; lastName?: string; email?: string }
}) {
  const { t } = useI18n()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [tosAccepted, setTosAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setFirstName(initial?.firstName ?? "")
    setLastName(initial?.lastName ?? "")
    setEmail(initial?.email ?? "")
    setTosAccepted(false)
  }, [open, initial?.firstName, initial?.lastName, initial?.email])

  const valid =
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    email.trim().includes("@") &&
    tosAccepted

  const handleSave = async () => {
    if (!valid || submitting) return
    setSubmitting(true)
    const data = await patchUserData({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      tosAccepted: true,
    })
    setSubmitting(false)
    if (!data) {
      toast.error(t("profile.completeFailed"))
      return
    }
    toast.success(t("profile.completeSuccess"))
    onCompleted()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <UserCircle className="h-5 w-5 text-primary" />
            {t("profile.completeTitle")}
          </DialogTitle>
          <DialogDescription>{t("profile.completeDesc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="rounded-lg border border-border bg-input p-3 text-xs text-muted-foreground">
            {t("profile.steamNote")}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="profile-first-name">{t("profile.firstName")}</Label>
              <Input
                id="profile-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="border-border bg-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-last-name">{t("profile.lastName")}</Label>
              <Input
                id="profile-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="border-border bg-input"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-email">{t("profile.email")}</Label>
            <Input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-border bg-input"
            />
          </div>

          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <Checkbox checked={tosAccepted} onCheckedChange={(v) => setTosAccepted(v === true)} className="mt-0.5" />
            <span>
              {t("profile.tosPrefix")}{" "}
              <Link href="/kullanim-kosullari" target="_blank" className="text-primary hover:underline">
                {t("profile.tosLink")}
              </Link>{" "}
              {t("profile.tosSuffix")}
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={!valid || submitting}
            className="w-full bg-primary font-bold text-primary-foreground"
          >
            {submitting ? "..." : t("profile.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
