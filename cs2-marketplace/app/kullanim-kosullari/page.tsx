import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Kullanım Koşulları — SkinApex",
  description: "SkinApex kullanım koşulları.",
}

export default function KullanimKosullariPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-8">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Ana Sayfaya Dön
        </Link>

        <h1 className="mb-2 text-3xl font-bold text-foreground">Kullanım Koşulları</h1>
        <p className="mb-8 text-sm text-muted-foreground">Son güncelleme: Haziran 2025</p>

        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-2 text-base font-bold text-foreground">1. Hizmet</h2>
            <p>
              SkinApex, Counter-Strike 2 (CS2) dijital eşyalarının alım-satımına aracılık eden bir
              pazaryeri platformudur. Platform, Steam hesabınızla giriş yapmanızı gerektirir.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-bold text-foreground">2. Teslimat</h2>
            <p>
              Satıcılar satın alma sonrası <strong>2 saat</strong> içinde Steam takası ile teslim
              etmekle yükümlüdür. Teslim edilmeyen siparişlerde alıcıya iade uygulanabilir.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-bold text-foreground">3. Bakiye ve ödemeler</h2>
            <p>
              Platform bakiyesi yalnızca SkinApex üzerindeki işlemler için kullanılır. Gerçek para
              yatırma/çekme işlemleri ilgili ödeme sağlayıcıları ve mevzuata tabidir.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-bold text-foreground">4. Yasaklı davranışlar</h2>
            <p>
              Dolandırıcılık, sahte ilan, başkasının trade URL&apos;sini kullanma, sistem
              açıklarını istismar etme ve kötüye kullanım yasaktır. İhlallerde hesap kısıtlanabilir.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-bold text-foreground">5. Sorumluluk sınırı</h2>
            <p>
              SkinApex, Steam veya Valve ile bağlı değildir. Dijital eşya işlemlerindeki riskler
              kullanıcı sorumluluğundadır; platform makul özeni gösterir ancak Steam kesintilerinden
              sorumlu tutulamaz.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-bold text-foreground">6. İletişim</h2>
            <p>
              Sorularınız için:{" "}
              <a href="mailto:support@skinapex.net" className="text-primary hover:underline">
                support@skinapex.net
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
