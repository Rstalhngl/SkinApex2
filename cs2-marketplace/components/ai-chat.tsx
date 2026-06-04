"use client"

import { useEffect, useRef, useState } from "react"
import { Bot, ChevronDown, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface Message {
  id: number
  role: "user" | "bot"
  text: string
  ts: number
}

// ─── Rule-based responses ─────────────────────────────────────────────────────

const RULES: { patterns: RegExp[]; answer: string }[] = [
  {
    patterns: [/nasıl.*satın|satın.*nasıl|alım.*nasıl|ürün.*al/i],
    answer: "Beğendiğiniz bir ürünün üzerine gelin ve **Sepete Ekle** butonuna tıklayın. Sepet simgesinden tüm ürünlerinizi görebilir, ardından **Güvenli Ödeme** ile satın alabilirsiniz.",
  },
  {
    patterns: [/teklif|offer/i],
    answer: "Bir ürüne teklif vermek için ürün kartının üzerine gelip **Teklif Ver** butonuna tıklayın ya da göz ikonuyla ürünü inceleyip teklif ekranını açın. Minimum teklif, ilan fiyatının **%60'ı** kadardır.",
  },
  {
    patterns: [/emanet|escrow|8.*gün|para.*ne zaman/i],
    answer: "Satın alma sonrası ödeme **8 günlük emanet** sürecine girer. Bu süre içinde sorun yaşamazsanız para satıcıya aktarılır. Sorun yaşarsanız 'Siparişlerim' bölümünden destek talebi oluşturabilirsiniz.",
  },
  {
    patterns: [/sipari[sş]|order/i],
    answer: "Siparişlerinizi görmek için sağ üst köşedeki profil menüsüne tıklayın ve **Siparişlerim**'i seçin. Emanette bekleyen siparişleriniz için destek talebi açabilirsiniz.",
  },
  {
    patterns: [/yükle|bakiye|depozit|deposit|para/i],
    answer: "Bakiye yüklemek için profil menüsünden **Bakiye Yükle**'ye tıklayın. ₺500, ₺1.000, ₺5.000, ₺10.000 veya ₺20.000 seçenekleri mevcuttur. Visa, Mastercard ve Havale ile ödeme yapabilirsiniz.",
  },
  {
    patterns: [/sat[ıi][sş]|ilan|liste/i],
    answer: "Kendi skinlerinizi satışa çıkarmak için 'Profil ve Envanter'e gidin veya ürün kartlarında **İlanı Yayınla** butonunu kullanın. Satış fiyatını kendiniz belirleyebilirsiniz.",
  },
  {
    patterns: [/trade.*url|takas.*url/i],
    answer: "Steam Takas URL'nizi ayarlamak için profil menüsünden **Takas URL Ayarları**'na tıklayın. URL'nizi Steam profilinizden alabilirsiniz.",
  },
  {
    patterns: [/steam.*giri[sş]|login|giri[sş]/i],
    answer: "Giriş yapmak için sağ üst köşedeki **Steam ile Giriş Yap** butonuna tıklayın. Steam hesabınızla güvenli şekilde bağlanabilirsiniz.",
  },
  {
    patterns: [/float|aş[ıi]nm[ıi][sş]|durum|exterior/i],
    answer: "Float değeri, bir silahın ne kadar aşındığını gösteren 0-1 arası bir sayıdır. 0'a yakın = **Fabrikadan Yeni Çıkmış (FN)**, 1'e yakın = **Savaş Görmüş (BS)**. Düşük float değeri genellikle daha yüksek fiyat anlamına gelir.",
  },
  {
    patterns: [/destek|yardım|sorun|problem|support/i],
    answer: "Destek almak için sol alt köşedeki **Yardım** linkine tıklayarak **support@skinapex.net** adresine mail gönderebilirsiniz. 7/24 hizmetinizdeyiz.",
  },
  {
    patterns: [/bildirim|çan|notification/i],
    answer: "Bildirimlerinizi sağ üst köşedeki **çan simgesi**nden takip edebilirsiniz. Teklif geldiğinde, kabul/red bildirimlerinde ve sipariş güncellemelerinde bildirim alırsınız.",
  },
  {
    patterns: [/çerez|kvkk|gizlilik|privacy/i],
    answer: "Çerez tercihlerinizi sayfanın alt kısmındaki **Çerez Bildirimi**'nden yönetebilirsiniz. Detaylı bilgi için Çerez Politikası sayfamızı ziyaret edebilirsiniz.",
  },
  {
    patterns: [/kur|dolar|tl|türk.*lira|exchange/i],
    answer: "Sitemizdeki tüm fiyatlar **Türk Lirası (₺)** cinsindendir. Dolar kuru **frankfurter.app** üzerinden saatlik olarak güncellenmektedir. Ürün kartlarında Steam USD referans fiyatı da küçük bir etiketle gösterilir.",
  },
  {
    patterns: [/merhaba|selam|hey|hi|hello/i],
    answer: "Merhaba! 👋 SkinApex'e hoş geldiniz. Size nasıl yardımcı olabilirim?",
  },
  {
    patterns: [/teşekkür|sağol|tamam|anladım/i],
    answer: "Rica ederim! Başka bir sorunuz olursa yardımcı olmaya hazırım. 😊",
  },
]

const FALLBACK =
  "Bu konuda şu an size yardımcı olamıyorum. Daha fazla destek için **support@skinapex.net** adresine ulaşabilirsiniz."

function getAnswer(text: string): string {
  const lower = text.toLowerCase()
  for (const rule of RULES) {
    if (rule.patterns.some(p => p.test(lower))) return rule.answer
  }
  return FALLBACK
}

// Simple markdown bold → JSX
function renderText(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return parts.map((p, i) =>
    i % 2 === 1 ? <strong key={i}>{p}</strong> : <span key={i}>{p}</span>,
  )
}

let msgId = 0

const WELCOME: Message = {
  id: msgId++,
  role: "bot",
  text: "Merhaba! Ben SkinApex asistanıyım. Satın alma, teklif verme, bakiye yükleme ve daha fazlası hakkında sorularınızı yanıtlayabilirim.",
  ts: Date.now(),
}

export function AiChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState("")
  const [typing, setTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, typing])

  const send = () => {
    const text = input.trim()
    if (!text) return
    const userMsg: Message = { id: msgId++, role: "user", text, ts: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setTyping(true)

    setTimeout(() => {
      const answer = getAnswer(text)
      setTyping(false)
      setMessages(prev => [...prev, { id: msgId++, role: "bot", text: answer, ts: Date.now() }])
    }, 600 + Math.random() * 600)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "fixed bottom-12 right-4 z-40 flex h-13 w-13 items-center justify-center rounded-full shadow-lg transition-all duration-200",
          "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105",
          open && "rotate-0",
        )}
        aria-label="SkinApex AI Asistan"
        style={{ width: 52, height: 52 }}
      >
        {open ? <ChevronDown className="h-5 w-5" /> : <Bot className="h-6 w-6" />}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-20 right-4 z-40 flex w-[340px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          style={{ maxHeight: "480px" }}>
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border bg-primary/10 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
              <Bot className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">SkinApex Asistan</p>
              <p className="text-[10px] text-success flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-success inline-block" />
                Çevrimiçi
              </p>
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
            style={{ maxHeight: "340px" }}>
            {messages.map(msg => (
              <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "bot" && (
                  <div className="mr-2 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed",
                  msg.role === "user"
                    ? "rounded-tr-sm bg-primary text-primary-foreground"
                    : "rounded-tl-sm bg-input text-foreground",
                )}>
                  {renderText(msg.text)}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary/20">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-input px-3 py-2">
                  <span className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border px-3 py-2 flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Soru sorun..."
              className="h-9 border-border bg-input text-xs text-foreground placeholder:text-muted-foreground"
            />
            <Button size="sm" onClick={send} disabled={!input.trim() || typing}
              className="h-9 w-9 shrink-0 bg-primary p-0 text-primary-foreground hover:bg-primary/90">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
