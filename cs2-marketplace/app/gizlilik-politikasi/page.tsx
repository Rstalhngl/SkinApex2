import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Gizlilik Politikası — SkinApex",
  description: "SkinApex gizlilik politikası ve KVKK bilgileri.",
}

export default function GizlilikPolitikasiPage() {
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

        <h1 className="mb-2 text-3xl font-bold text-foreground">Gizlilik Politikası</h1>
        <p className="mb-8 text-sm text-muted-foreground">Son güncelleme: Haziran 2025</p>

        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-2 text-base font-bold text-foreground">1. Toplanan veriler</h2>
            <p>
              Steam OpenID ile giriş yaptığınızda Steam ID, kullanıcı adı, avatar, trade URL (siz
              girerseniz), işlem geçmişi ve platform içi tercihleriniz (sepet, favoriler) işlenir.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-bold text-foreground">2. Kullanım amacı</h2>
            <p>
              Veriler hesap yönetimi, alım-satım işlemleri, destek talepleri, güvenlik ve yasal
              yükümlülükler için kullanılır.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-bold text-foreground">3. Saklama</h2>
            <p>
              Veriler sunucuda güvenli şekilde saklanır. Oturum çerezleri hizmetin çalışması için
              gereklidir; ayrıntılar için{" "}
              <Link href="/cerez-politikasi" className="text-primary hover:underline">
                Çerez Politikası
              </Link>
              &apos;na bakın.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-bold text-foreground">4. Üçüncü taraflar</h2>
            <p>
              Steam (Valve), ödeme sağlayıcıları (etkinleştirildiğinde) ve barındırma altyapısı
              hizmet sağlayıcılarıyla sınırlı veri paylaşımı yapılabilir.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-bold text-foreground">5. Haklarınız (KVKK)</h2>
            <p>
              Kişisel verilerinize erişim, düzeltme ve silme taleplerinizi{" "}
              <a href="mailto:support@skinapex.net" className="text-primary hover:underline">
                support@skinapex.net
              </a>{" "}
              adresine iletebilirsiniz.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
