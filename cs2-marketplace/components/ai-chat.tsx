"use client"

import { useEffect, useRef, useState } from "react"
import { Bot, ChevronDown, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface Message {
  id: number
  role: "user" | "bot"
  text: string
}

// ─── Rule-based knowledge base ───────────────────────────────────────────────

const RULES: { patterns: RegExp[]; answer: string }[] = [
  // Greetings
  {
    patterns: [/^(merhaba|selam|hey|hi|hello|iyi günler|günaydın|iyi akşamlar)[\s!?.]*$/i],
    answer: "Merhaba! 👋 SkinApex'e hoş geldiniz. Size nasıl yardımcı olabilirim?",
  },
  {
    patterns: [/teşekkür|sağol|tamam.*anla|anladım|harika|süper|güzel/i],
    answer: "Rica ederim! Başka bir sorunuz olursa buradayım. 😊",
  },

  // Favorites / Wishlist
  {
    patterns: [/favori|istek.*list|wishlist|beğen|kaydet/i],
    answer: "Favorilerinizi görmek için sağ üst köşedeki **kalp simgesi**ne tıklayın. Bir ürünü favorilere eklemek için ürün kartının üzerine gelin ve kalp ikonuna tıklayın.",
  },

  // Language setting
  {
    patterns: [/dil.*ayar|ayar.*dil|türkçe.*nasıl|language|ingilizce.*geç|dili.*değiştir/i],
    answer: "Dil ayarını değiştirmek için sağ üst köşedeki **küre (🌐) simgesi**ne tıklayın. Türkçe, İngilizce, Almanca, Rusça ve daha fazla dil seçeneği mevcuttur.",
  },

  // Theme / dark mode
  {
    patterns: [/tema|koyu|açık.*mod|dark.*mode|light.*mode|renk.*tema/i],
    answer: "Tema değiştirmek için sağ üst köşedeki **profil menüsü**ne tıklayın. Orada **Koyu Mod / Açık Mod** seçeneğini bulabilirsiniz.",
  },

  // Cart
  {
    patterns: [/sepet|cart|seçtiklerim/i],
    answer: "Sepetinizi sağ üst köşedeki **alışveriş sepeti simgesi**nden görüntüleyebilirsiniz. Ödeme yapmak için sepet ekranından **Güvenli Ödeme**'ye tıklayın.",
  },

  // How to buy
  {
    patterns: [/nasıl.*satın|satın.*nasıl|nasıl.*al[ıi]r|ürün.*al/i],
    answer: "Bir ürünü satın almak için:\n1. Ürünün üzerine gelin → **Sepete Ekle**'ye tıklayın\n2. Sağ üstteki sepet simgesine tıklayın\n3. **Güvenli Ödeme** butonuna basın\n4. Ödeme tamamlandıktan sonra ürün 8 günlük emanete girer.",
  },

  // Offer / Teklif
  {
    patterns: [/teklif.*ver|teklif.*nasıl|offer|pazarlık/i],
    answer: "Teklif vermek için ürün kartına tıklayarak inceleme ekranını açın ve **Teklif Ver** butonuna basın. Minimum teklif, ilan fiyatının **%60'ı** kadardır. Teklifiniz satıcıya bildirim olarak iletilir.",
  },

  // My offers
  {
    patterns: [/tekliflerim|verdiğim.*teklif|gelen.*teklif/i],
    answer: "Tekliflerinizi görmek için sağ üst **profil menüsü**nden **Tekliflerim**'e tıklayın. Gelen ve giden tekliflerinizi iki ayrı sekmede görebilir, kabul veya reddedebilirsiniz.",
  },

  // Orders / Escrow
  {
    patterns: [/sipari[sş]|order|satın.*aldıklar/i],
    answer: "Siparişlerinizi görmek için **profil menüsü → Siparişlerim**'e gidin. Satın aldığınız ürünler 8 günlük emanet sürecine girer. Bu sürede sorun yaşarsanız 'Destek Talebi' açabilirsiniz.",
  },

  {
    patterns: [/emanet|escrow|8.*gün|para.*ne zaman.*geç|güvende mi/i],
    answer: "Ödemeniz satın alma sonrası **8 gün emanette** tutulur. Bu süre içinde:\n• Ürün sorunsuz teslim edilirse → para satıcıya aktarılır\n• Sorun yaşarsanız → **Siparişlerim** ekranından destek talebi açın\n• Satıcı ürünü geri çekerse → para iade edilir, satıcı 1 hafta ilan açamaz.",
  },

  // Deposit / Bakiye yükleme
  {
    patterns: [/bakiye.*yükle|para.*yükle|depozit|ödeme.*yap|yükleme/i],
    answer: "Bakiye yüklemek için **profil menüsü → Bakiye Yükle**'ye tıklayın. ₺1.000, ₺5.000, ₺10.000, ₺20.000 seçenekleri veya istediğiniz tutarı girebilirsiniz. Visa, Mastercard ve Havale ile ödeme yapılabilir.",
  },

  // Withdraw / Para çekme
  {
    patterns: [/para.*çek|çekim|withdraw|bakiye.*çek/i],
    answer: "Para çekmek için **profil menüsü → Para Çek**'e tıklayın. IBAN bilgilerinizi girerek çekim talebinde bulunabilirsiniz. İşlemler 1-3 iş günü içinde tamamlanır.",
  },

  // Sell / Listing
  {
    patterns: [/nasıl.*sat[ıi]|sat.*nasıl|ilan.*koy|listeleme|satışa.*çıkar/i],
    answer: "Ürününüzü satışa çıkarmak için:\n1. Profil menüsünden **Profil ve Envanter**'e girin\n2. Satmak istediğiniz ürünün üzerine gelin → **İlanı Yayınla**'ya tıklayın\n3. Fiyatınızı TL olarak belirleyin\n4. İlan yayınlandıktan sonra alıcılar teklif verebilir veya direkt satın alabilir.",
  },

  // Trade URL
  {
    patterns: [/trade.*url|takas.*url|takas.*link/i],
    answer: "Steam Takas URL'nizi **profil menüsü → Takas URL Ayarları**'ndan girebilirsiniz. URL'nizi Steam profilinizden kopyalayabilirsiniz: Steam → Profil → Takas Teklifleri → Takas URL'im.",
  },

  // Steam login
  {
    patterns: [/steam.*giri[sş]|nasıl.*giri[sş]|hesab.*bağla|oturum.*aç/i],
    answer: "Giriş yapmak için sağ üst köşedeki **Steam ile Giriş Yap** butonuna tıklayın. Steam hesabınızla güvenli OpenID bağlantısı kurulur, şifreniz sitemizle paylaşılmaz.",
  },

  // Inventory / Steam inventory
  {
    patterns: [/envanter|inventory|steam.*envanter/i],
    answer: "Steam envanterinize ulaşmak için **profil menüsü → Steam Envanteri**'ne tıklayın. Bu sizi Steam'deki CS2 envanter sayfanıza yönlendirir.",
  },

  // Filter / Arama
  {
    patterns: [/filtre|sırala|kategori|nadirlik|arama|search/i],
    answer: "Sol paneldeki filtreler ile ürünleri **kategoriye** (Tüfek, Bıçak, Eldiven vb.), **nadirliğe**, **dış görünüme** (FN, FT, BS...), **fiyat aralığına** ve **özelliğe** (StatTrak™, Souvenir) göre filtreleyebilirsiniz. Ayrıca üstteki arama kutusuyla ürün adına göre arama yapabilirsiniz.",
  },

  // Float
  {
    patterns: [/float|aşınma|durum|exterior|fn|mw|ft|ww|bs/i],
    answer: "**Float değeri** (0–1 arası) bir silahın aşınma derecesini gösterir:\n• **FN** (Fabrikadan Yeni): 0.00–0.07\n• **MW** (Az Aşınmış): 0.07–0.15\n• **FT** (Görevde Kullanılmış): 0.15–0.38\n• **WW** (Eskimiş): 0.38–0.45\n• **BS** (Savaş Görmüş): 0.45–1.00\nDüşük float = daha temiz görünüm = genellikle daha yüksek fiyat.",
  },

  // Price / Fiyat
  {
    patterns: [/fiyat.*nasıl|fiyat.*belirl|piyasa.*fiyat|steam.*fiyat|referans/i],
    answer: "Fiyatlar **Skinport.com** üzerinden gerçek zamanlı piyasa verisiyle güncellenmektedir. Her ürün kartında **₺TRY** fiyatının yanında küçük harflerle **Steam USD referans fiyatı** da gösterilir. Kur **saatlik** olarak otomatik güncellenir.",
  },

  // Notifications
  {
    patterns: [/bildirim|çan|notification|haber.*ol/i],
    answer: "Bildirimlerinizi sağ üst köşedeki **çan (🔔) simgesi**nden takip edebilirsiniz. Teklif geldiğinde, teklifiniz kabul/reddedildiğinde bildirim alırsınız. Okunmamış bildirimler için kırmızı rozet görünür.",
  },

  // Support
  {
    patterns: [/destek|yardım|sorun|problem|iletişim|support|mail|e-posta/i],
    answer: "Destek almak için:\n• Sol alt köşedeki **'Yardım mı lazım?'** linkine tıklayın\n• **support@skinapex.net** adresine mail gönderin\n• **7/24** hizmetinizdeyiz, ortalama yanıt süresi 10 dakikadır.",
  },

  // Cookie / KVKK
  {
    patterns: [/çerez|kvkk|gizlilik|privacy|kişisel.*veri/i],
    answer: "Çerez tercihlerinizi sayfanın alt kısmındaki **Çerez Bildirimi**'nden yönetebilirsiniz. **Zorunlu çerezler** her zaman aktiftir; analitik ve pazarlama çerezlerini dilediğiniz zaman kapatabilirsiniz. Detaylar için Çerez Politikası sayfamıza göz atabilirsiniz.",
  },

  // Currency / Kur
  {
    patterns: [/kur|dolar|tl|türk.*lira|exchange|para.*birimi/i],
    answer: "Sitemizdeki tüm fiyatlar **Türk Lirası (₺)** cinsindendir. USD/TRY kuru **frankfurter.app** üzerinden **saatlik** olarak güncellenmektedir. Ürün fiyatları kur güncellendiğinde otomatik olarak yenilenir.",
  },

  // StatTrak / Souvenir
  {
    patterns: [/stattrak|souvenir|hatıra/i],
    answer: "**StatTrak™** silahlar, öldürme sayısını kayıt altına alır ve turuncu renkte görünür. **Souvenir** ürünler turnuvalarda düşen özel kaplamalardır. Her ikisi de sol filtre panelinden filtrelenebilir.",
  },

  // What is SkinApex
  {
    patterns: [/skinapex.*ne|site.*ne|nedir.*skinapex|hakkında/i],
    answer: "**SkinApex**, Counter-Strike 2 (CS2) oyunundaki silah kaplamalarını (skin) güvenli şekilde alıp satmanıza olanak tanıyan bir Türk marketplace platformudur. Steam ile güvenli giriş, anlık piyasa fiyatları ve 8 günlük emanet sistemi sunar.",
  },

  // How does escrow work  
  {
    patterns: [/güvenli mi|dolandırıcılık|güvence|siteniz güvenli/i],
    answer: "SkinApex, işlemleri güvence altına almak için **8 günlük emanet sistemi** kullanır. Para satın alma anında satıcıya geçmez; sorunsuz teslim onaylanırsa aktarılır. Steam OpenID ile giriş yapılır, şifreniz bizimle paylaşılmaz.",
  },
]

const FALLBACK_RESPONSES = [
  "Bu konuda daha fazla bilgi almak için **support@skinapex.net** adresine yazabilir veya sol alt köşedeki destek linkine tıklayabilirsiniz.",
  "Tam olarak ne hakkında yardım istediğinizi biraz daha açar mısınız? Satın alma, teklif verme, bakiye, filtreler gibi konularda yardımcı olabilirim.",
  "Bu soruyu anlayamadım. 'Favori', 'teklif', 'bakiye', 'sipariş', 'filtre' gibi anahtar kelimeler kullanarak tekrar sorabilir misiniz?",
]
let fallbackIdx = 0

function getAnswer(text: string): string {
  const lower = text.toLowerCase().trim()
  for (const rule of RULES) {
    if (rule.patterns.some(p => p.test(lower))) return rule.answer
  }
  const resp = FALLBACK_RESPONSES[fallbackIdx % FALLBACK_RESPONSES.length]
  fallbackIdx++
  return resp
}

// Render simple markdown bold
function renderText(text: string) {
  return text.split("\n").map((line, li) => (
    <span key={li}>
      {line.split(/\*\*(.*?)\*\*/g).map((p, i) =>
        i % 2 === 1 ? <strong key={i}>{p}</strong> : <span key={i}>{p}</span>,
      )}
      {li < text.split("\n").length - 1 && <br />}
    </span>
  ))
}

// Quick suggestion chips
const SUGGESTIONS = [
  "Favorilerimi nasıl görürüm?",
  "Bakiye nasıl yüklerim?",
  "Teklif nasıl veririm?",
  "Dili nasıl değiştiririm?",
]

let msgId = 0
const WELCOME: Message = {
  id: msgId++,
  role: "bot",
  text: "Merhaba! Ben SkinApex asistanıyım. 👋\nAşağıdaki konularda yardımcı olabilirim:",
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
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, typing])

  const send = (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg) return
    setMessages(prev => [...prev, { id: msgId++, role: "user", text: msg }])
    setInput("")
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setMessages(prev => [...prev, { id: msgId++, role: "bot", text: getAnswer(msg) }])
    }, 500 + Math.random() * 500)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-12 right-4 z-40 flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:scale-105"
        style={{ width: 52, height: 52 }}
        aria-label="SkinApex AI Asistan"
      >
        {open ? <ChevronDown className="h-5 w-5" /> : <Bot className="h-6 w-6" />}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-20 right-4 z-40 flex w-[340px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          style={{ maxHeight: 500 }}>
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border bg-primary/10 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
              <Bot className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">SkinApex Asistan</p>
              <p className="flex items-center gap-1 text-[10px] text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> Çevrimiçi
              </p>
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 px-3 py-3" style={{ maxHeight: 340 }}>
            {messages.map((msg, idx) => (
              <div key={msg.id}>
                <div className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                  {msg.role === "bot" && (
                    <div className="mr-2 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                  <div className={cn(
                    "max-w-[82%] rounded-2xl px-3 py-2 text-xs leading-relaxed",
                    msg.role === "user"
                      ? "rounded-tr-sm bg-primary text-primary-foreground"
                      : "rounded-tl-sm bg-input text-foreground",
                  )}>
                    {renderText(msg.text)}
                  </div>
                </div>
                {/* Show suggestion chips after welcome message */}
                {idx === 0 && msg.role === "bot" && (
                  <div className="mt-2 ml-8 flex flex-wrap gap-1.5">
                    {SUGGESTIONS.map(s => (
                      <button key={s} onClick={() => send(s)}
                        className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary transition-colors hover:bg-primary/20">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
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
          <div className="flex gap-2 border-t border-border px-3 py-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Bir soru sorun..."
              className="h-9 border-border bg-input text-xs text-foreground placeholder:text-muted-foreground"
            />
            <Button size="sm" onClick={() => send()} disabled={!input.trim() || typing}
              className="h-9 w-9 shrink-0 bg-primary p-0 hover:bg-primary/90">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
