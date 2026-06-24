import type { UserNotificationType } from "@/lib/notification-types"

const MAX_LEN = 120

function clip(text: string): string {
  const t = text.trim()
  return t.length <= MAX_LEN ? t : `${t.slice(0, MAX_LEN - 1)}…`
}

/** Extract "Item Name" from messages like "...: Item Name — ..." or "...: Item Name." */
function itemFromMessage(message: string): string | null {
  const match = message.match(/:\s*([^—.\n]+?)(?:\s*[—.]|\s*$)/)
  return match?.[1]?.trim() || null
}

const ITEM_SOLD_RULES: { prefix: string; subject: (item: string | null) => string }[] = [
  { prefix: "Ürününüz satıldı:", subject: (item) => (item ? `Ürününüz satıldı: ${item}` : "Ürününüz satıldı") },
  { prefix: "Satış tamamlandı, bakiyenize eklendi:", subject: (item) => (item ? `Satış tamamlandı: ${item}` : "Satış tamamlandı") },
  { prefix: "Teslimat tamamlandı (Steam takas):", subject: (item) => (item ? `Teslim alındı: ${item}` : "Teslimat tamamlandı") },
  { prefix: "Satıcı teslim ettiğini bildirdi:", subject: (item) => (item ? `Satıcı teslim etti: ${item}` : "Satıcı teslim etti") },
  { prefix: "Para çekme talebiniz tamamlandı:", subject: () => "Para çekme talebiniz tamamlandı" },
  { prefix: "Para çekme talebiniz reddedildi:", subject: () => "Para çekme talebiniz reddedildi" },
  { prefix: "Destek talebiniz alındı, inceleniyor:", subject: (item) => (item ? `Destek talebiniz alındı: ${item}` : "Destek talebiniz alındı") },
  { prefix: "Destek talebiniz onaylandı, iade yapıldı:", subject: (item) => (item ? `İade yapıldı: ${item}` : "Destek talebiniz onaylandı") },
  { prefix: "Destek talebiniz incelendi:", subject: (item) => (item ? `Destek kararı: ${item}` : "Destek talebiniz incelendi") },
  { prefix: "Destek talebi alıcı lehine sonuçlandı:", subject: (item) => (item ? `Destek kararı (alıcı): ${item}` : "Destek kararı — alıcı lehine") },
  { prefix: "Destek talebi satıcı lehine sonuçlandı:", subject: (item) => (item ? `Destek kararı (satıcı): ${item}` : "Destek kararı — satıcı lehine") },
  { prefix: "Alıcı destek talebi açtı:", subject: (item) => (item ? `Destek talebi açıldı: ${item}` : "Alıcı destek talebi açtı") },
  { prefix: "Destek talebi açıldı:", subject: (item) => (item ? `Destek talebi: ${item}` : "Destek talebi açıldı") },
  { prefix: "Destek talebi iadesi:", subject: (item) => (item ? `Destek iadesi: ${item}` : "Destek iadesi") },
  { prefix: "Teslimat süresi doldu, iade edildi:", subject: (item) => (item ? `Süre doldu, iade: ${item}` : "Teslimat süresi doldu — iade") },
  { prefix: "Size ayrılan 2 saatlik süre içinde", subject: () => "Teslimat süresi doldu" },
  { prefix: "Takas teklifi reddedildi/iptal:", subject: (item) => (item ? `Takas iptal: ${item}` : "Takas teklifi iptal") },
  { prefix: "Takas teklifi tamamlanamadı:", subject: (item) => (item ? `Takas başarısız: ${item}` : "Takas teklifi başarısız") },
  { prefix: "Bot teslimat hatası:", subject: (item) => (item ? `Bot teslimat hatası: ${item}` : "Bot teslimat hatası") },
  { prefix: "İlanınız yayında:", subject: (item) => (item ? `İlanınız yayında: ${item}` : "İlanınız yayında") },
  { prefix: "İlan taslağı oluşturuldu:", subject: (item) => (item ? `Bot'a item gönderin: ${item}` : "İlan için bot deposit gerekli") },
]

export function buildEmailSubject(type: UserNotificationType, message: string): string {
  if (type === "offer_received") {
    const item = itemFromMessage(message)
    return item ? `Yeni teklif: ${item}` : "Yeni teklif aldınız"
  }
  if (type === "offer_accepted") {
    const item = itemFromMessage(message)
    return item ? `Teklifiniz kabul edildi: ${item}` : "Teklifiniz kabul edildi"
  }
  if (type === "offer_rejected") {
    const item = itemFromMessage(message)
    return item ? `Teklifiniz reddedildi: ${item}` : "Teklifiniz reddedildi"
  }
  if (type === "delivery_reminder") {
    return "Teslimat hatırlatması — SkinApex"
  }

  for (const rule of ITEM_SOLD_RULES) {
    if (message.startsWith(rule.prefix)) {
      return clip(rule.subject(itemFromMessage(message)))
    }
  }

  const item = itemFromMessage(message)
  if (item) return clip(`SkinApex: ${item}`)
  return clip(message.split("\n")[0] || "SkinApex bildirimi")
}

export function buildAdminEmailSubject(message: string): string {
  if (message.startsWith("Yeni para çekme talebi:")) {
    const amount = message.match(/:\s*([\d.,]+)\s*TL/)?.[1]
    return amount ? `Yeni para çekme talebi: ${amount} TL` : "Yeni para çekme talebi"
  }
  if (message.startsWith("Yeni destek talebi:")) {
    const item = itemFromMessage(message)
    return item ? `Yeni destek talebi: ${item}` : "Yeni destek talebi"
  }
  return clip(message.split("\n")[0] || "SkinApex admin uyarısı")
}
