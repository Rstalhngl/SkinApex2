import type { UserNotificationType } from "@/lib/notification-types"

const MAX_LEN = 120

function clip(text: string): string {
  const t = text.trim()
  return t.length <= MAX_LEN ? t : `${t.slice(0, MAX_LEN - 1)}…`
}

function amountTry(message: string): string | null {
  return message.match(/([\d.,]+)\s*TL/)?.[1] ?? null
}

/** Extract item/skin name after the first "label: " segment. */
function itemAfterColon(message: string): string | null {
  const match = message.match(/:\s*([^—.\n]+?)(?:\s*[—.]|\s*$)/)
  return match?.[1]?.trim() || null
}

function itemAfterOfferReceived(message: string): string | null {
  const match = message.match(/teklif verdi:\s*(.+?)(?:\s*—|\s*$)/i)
  return match?.[1]?.trim() || itemAfterColon(message)
}

type SubjectRule = {
  prefix: string
  subject: (message: string) => string
}

const ADMIN_RULES: SubjectRule[] = [
  {
    prefix: "Yeni para çekme talebi:",
    subject: (msg) => {
      const amt = amountTry(msg)
      return amt ? `Yeni para çekme talebi: ${amt} TL` : "Yeni para çekme talebi"
    },
  },
  {
    prefix: "Yeni destek talebi:",
    subject: (msg) => {
      const item = itemAfterColon(msg)
      return item ? `Yeni destek talebi: ${item}` : "Yeni destek talebi"
    },
  },
]

const ITEM_SOLD_RULES: SubjectRule[] = [
  {
    prefix: "Ürününüz satıldı:",
    subject: (msg) => {
      const item = itemAfterColon(msg)
      return item ? `Ürününüz satıldı: ${item}` : "Ürününüz satıldı"
    },
  },
  {
    prefix: "Satış tamamlandı, bakiyenize eklendi:",
    subject: (msg) => {
      const item = itemAfterColon(msg)
      return item ? `Satış tamamlandı: ${item}` : "Satış tamamlandı — bakiye eklendi"
    },
  },
  {
    prefix: "Teslimat tamamlandı (Steam takas):",
    subject: (msg) => {
      const item = itemAfterColon(msg)
      return item ? `Teslim alındı: ${item}` : "Teslimat tamamlandı"
    },
  },
  {
    prefix: "Satıcı teslim ettiğini bildirdi:",
    subject: (msg) => {
      const item = itemAfterColon(msg)
      return item ? `Satıcı teslim etti — onaylayın: ${item}` : "Satıcı teslim etti — onaylayın"
    },
  },
  {
    prefix: "Para çekme talebiniz tamamlandı:",
    subject: (msg) => {
      const amt = amountTry(msg)
      return amt ? `Para çekme tamamlandı: ${amt} TL` : "Para çekme talebiniz tamamlandı"
    },
  },
  {
    prefix: "Para çekme talebiniz reddedildi:",
    subject: (msg) => {
      const amt = amountTry(msg)
      return amt ? `Para çekme reddedildi: ${amt} TL` : "Para çekme talebiniz reddedildi"
    },
  },
  {
    prefix: "Destek talebiniz alındı, inceleniyor:",
    subject: (msg) => {
      const item = itemAfterColon(msg)
      return item ? `Destek talebiniz alındı: ${item}` : "Destek talebiniz alındı"
    },
  },
  {
    prefix: "Destek talebiniz onaylandı, iade yapıldı:",
    subject: (msg) => {
      const item = itemAfterColon(msg)
      return item ? `İade yapıldı: ${item}` : "Destek talebiniz onaylandı — iade"
    },
  },
  {
    prefix: "Destek talebiniz incelendi:",
    subject: (msg) => {
      const item = itemAfterColon(msg)
      return item ? `Destek kararı — satıcı lehine: ${item}` : "Destek kararı — satıcı lehine"
    },
  },
  {
    prefix: "Destek talebi alıcı lehine sonuçlandı:",
    subject: (msg) => {
      const item = itemAfterColon(msg)
      return item ? `Destek kararı — alıcı lehine: ${item}` : "Destek kararı — alıcı lehine"
    },
  },
  {
    prefix: "Destek talebi satıcı lehine sonuçlandı:",
    subject: (msg) => {
      const item = itemAfterColon(msg)
      return item ? `Destek kararı — satıcı lehine: ${item}` : "Destek kararı — satıcı lehine"
    },
  },
  {
    prefix: "Alıcı destek talebi açtı:",
    subject: (msg) => {
      const item = itemAfterColon(msg)
      return item ? `Alıcı destek açtı: ${item}` : "Alıcı destek talebi açtı"
    },
  },
  {
    prefix: "Destek talebi açıldı:",
    subject: (msg) => {
      const item = itemAfterColon(msg)
      return item ? `Destek iadesi — satıcı: ${item}` : "Destek talebi — satıcıya iade"
    },
  },
  {
    prefix: "Destek talebi iadesi:",
    subject: (msg) => {
      const item = itemAfterColon(msg)
      return item ? `Destek iadesi: ${item}` : "Destek iadesi"
    },
  },
  {
    prefix: "Teslimat süresi doldu, iade edildi:",
    subject: (msg) => {
      const item = itemAfterColon(msg)
      const amt = amountTry(msg)
      if (item && amt) return `Süre doldu — iade: ${item} (${amt} TL)`
      return item ? `Süre doldu — iade: ${item}` : "Teslimat süresi doldu — iade"
    },
  },
  {
    prefix: "Size ayrılan 2 saatlik süre içinde",
    subject: () => "Teslimat süresi doldu — satış iptal",
  },
  {
    prefix: "Takas teklifi reddedildi/iptal:",
    subject: (msg) => {
      const item = itemAfterColon(msg)
      return item ? `Takas iptal: ${item}` : "Takas teklifi iptal"
    },
  },
  {
    prefix: "Takas teklifi tamamlanamadı:",
    subject: (msg) => {
      const item = itemAfterColon(msg)
      return item ? `Takas başarısız: ${item}` : "Takas teklifi başarısız"
    },
  },
  {
    prefix: "Bot teslimat hatası:",
    subject: (msg) => {
      const item = itemAfterColon(msg)
      return item ? `Bot teslimat hatası: ${item}` : "Bot teslimat hatası"
    },
  },
  {
    prefix: "İlanınız yayında:",
    subject: (msg) => {
      const item = itemAfterColon(msg)
      return item ? `İlan yayında: ${item}` : "İlanınız yayında"
    },
  },
  {
    prefix: "İlan taslağı oluşturuldu:",
    subject: (msg) => {
      const item = itemAfterColon(msg)
      if (msg.includes("Bot trade URL yapılandırılmadı")) {
        return item ? `Bot ayarı eksik — ilan: ${item}` : "Bot trade URL yapılandırılmadı"
      }
      return item ? `Bot'a item gönderin: ${item}` : "İlan için bot deposit gerekli"
    },
  },
]

function matchRules(rules: SubjectRule[], message: string): string | null {
  for (const rule of rules) {
    if (message.startsWith(rule.prefix)) {
      return clip(rule.subject(message))
    }
  }
  return null
}

export function buildEmailSubject(type: UserNotificationType, message: string): string {
  const admin = matchRules(ADMIN_RULES, message)
  if (admin) return admin

  if (type === "offer_received") {
    const item = itemAfterOfferReceived(message)
    return item ? `Yeni teklif: ${item}` : "Yeni teklif aldınız"
  }

  if (type === "offer_accepted") {
    const item = itemAfterColon(message)
    return item ? `Teklifiniz kabul edildi: ${item}` : "Teklifiniz kabul edildi"
  }

  if (type === "offer_rejected") {
    if (message.startsWith("Teklifiniz reddedildi (ilan satıldı):")) {
      const item = itemAfterColon(message)
      return item ? `Teklif geçersiz (ilan satıldı): ${item}` : "Teklifiniz reddedildi — ilan satıldı"
    }
    const item = itemAfterColon(message)
    return item ? `Teklifiniz reddedildi: ${item}` : "Teklifiniz reddedildi"
  }

  if (type === "delivery_reminder") {
    const item = itemAfterColon(message)
    return item ? `Teslimat hatırlatması: ${item}` : "Teslimat hatırlatması"
  }

  const sold = matchRules(ITEM_SOLD_RULES, message)
  if (sold) return sold

  const item = itemAfterColon(message)
  if (item) return clip(`SkinApex: ${item}`)

  return clip(message.split("\n")[0] || "SkinApex bildirimi")
}

export function buildAdminEmailSubject(message: string): string {
  const admin = matchRules(ADMIN_RULES, message)
  if (admin) return admin
  return clip(message.split("\n")[0] || "SkinApex admin uyarısı")
}

/** All notification message prefixes — used by tests to ensure coverage. */
export const NOTIFICATION_MESSAGE_FIXTURES: {
  type: UserNotificationType
  message: string
  expectedSubjectIncludes: string
}[] = [
  { type: "item_sold", message: "Ürününüz satıldı: AK-47 | Redline — ₺1.500. Teslimat bot tarafından otomatik gönderilecek.", expectedSubjectIncludes: "Ürününüz satıldı: AK-47 | Redline" },
  { type: "item_sold", message: "Para çekme talebiniz tamamlandı: 500 TL — TR1200...", expectedSubjectIncludes: "Para çekme tamamlandı: 500 TL" },
  { type: "item_sold", message: "Para çekme talebiniz reddedildi: 500 TL bakiyenize iade edildi. Sebep", expectedSubjectIncludes: "Para çekme reddedildi: 500 TL" },
  { type: "item_sold", message: "Yeni para çekme talebi: 500 TL — TR12 (76561198)", expectedSubjectIncludes: "Yeni para çekme talebi: 500 TL" },
  { type: "item_sold", message: "Yeni destek talebi: AK-47 — 1500 TL (Satış: sale-1)", expectedSubjectIncludes: "Yeni destek talebi: AK-47" },
  { type: "item_sold", message: "Satıcı teslim ettiğini bildirdi: AWP | Asiimov. Lütfen kontrol edip onaylayın.", expectedSubjectIncludes: "Satıcı teslim etti" },
  { type: "item_sold", message: "Teslimat süresi doldu, iade edildi: M4A4 — 800 TL", expectedSubjectIncludes: "Süre doldu" },
  { type: "item_sold", message: "Size ayrılan 2 saatlik süre içinde ürünü teslim edemediğiniz için işleminiz iptal edilmiştir.", expectedSubjectIncludes: "Teslimat süresi doldu" },
  { type: "item_sold", message: "İlan taslağı oluşturuldu: Desert Eagle. Bot trade URL yapılandırılmadı — destek ile iletişime geçin.", expectedSubjectIncludes: "Bot ayarı eksik" },
  { type: "offer_received", message: "PlayerOne teklif verdi: Glock-18 — ₺200", expectedSubjectIncludes: "Yeni teklif: Glock-18" },
  { type: "offer_accepted", message: "Teklifiniz kabul edildi: USP-S — ₺150", expectedSubjectIncludes: "Teklifiniz kabul edildi: USP-S" },
  { type: "offer_rejected", message: "Teklifiniz reddedildi: P250", expectedSubjectIncludes: "Teklifiniz reddedildi: P250" },
  { type: "offer_rejected", message: "Teklifiniz reddedildi (ilan satıldı): Knife", expectedSubjectIncludes: "ilan satıldı" },
  { type: "delivery_reminder", message: "Teslimat için 30 dk kaldı: AK-47", expectedSubjectIncludes: "Teslimat hatırlatması" },
]
