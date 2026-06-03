import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Çerez Politikası — SkinApex",
  description: "SkinApex çerez politikası ve KVKK uyum bilgileri.",
}

export default function CerezPolitikasi() {
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

        <h1 className="mb-2 text-3xl font-bold text-foreground">Çerez Politikası</h1>
        <p className="mb-8 text-sm text-muted-foreground">Son güncelleme: Haziran 2025</p>

        <div className="prose prose-invert max-w-none space-y-8 text-sm text-muted-foreground [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-foreground [&_p]:leading-relaxed [&_ul]:mt-2 [&_ul]:space-y-1 [&_ul]:pl-5 [&_ul]:list-disc">

          <section>
            <h2>1. Çerez Nedir?</h2>
            <p>
              Çerezler, ziyaret ettiğiniz web sitesi tarafından tarayıcınıza yerleştirilen küçük metin dosyalarıdır.
              Bu dosyalar, siteyi tekrar ziyaret ettiğinizde sizi tanımak ve deneyiminizi kişiselleştirmek için kullanılır.
            </p>
          </section>

          <section>
            <h2>2. Kullandığımız Çerez Türleri</h2>

            <div className="mt-4 overflow-hidden rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-input">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-foreground">Tür</th>
                    <th className="px-4 py-2 text-left font-semibold text-foreground">Amaç</th>
                    <th className="px-4 py-2 text-left font-semibold text-foreground">Zorunlu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-4 py-3 font-semibold text-foreground">Zorunlu Çerezler</td>
                    <td className="px-4 py-3">Steam OpenID oturumu, dil tercihi, sepet ve bakiye verileri</td>
                    <td className="px-4 py-3 text-success font-semibold">Evet</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-foreground">Analitik Çerezler</td>
                    <td className="px-4 py-3">Vercel Analytics aracılığıyla anonim ziyaretçi istatistikleri</td>
                    <td className="px-4 py-3 text-muted-foreground">Hayır</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-foreground">Pazarlama Çerezleri</td>
                    <td className="px-4 py-3">Kişiselleştirilmiş içerik ve kampanya takibi</td>
                    <td className="px-4 py-3 text-muted-foreground">Hayır</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2>3. Zorunlu Çerezlerin Ayrıntısı</h2>
            <ul>
              <li><strong className="text-foreground">skx_steam_profile</strong> — Steam girişi sonrası kullanıcı profil bilgileri (localStorage)</li>
              <li><strong className="text-foreground">skx_trade_url</strong> — Kullanıcının kaydettiği Steam takas URL'si (localStorage)</li>
              <li><strong className="text-foreground">skx_listed_skins</strong> — Kullanıcının satışa çıkardığı ürünler (localStorage)</li>
              <li><strong className="text-foreground">skx_cs2_v*</strong> — CS2 item listesi önbelleği, 24 saat geçerli (localStorage)</li>
              <li><strong className="text-foreground">skinapex-lang</strong> — Dil tercihi (localStorage)</li>
              <li><strong className="text-foreground">skx_cookie_consent_v1</strong> — Çerez onay kaydı (localStorage)</li>
            </ul>
          </section>

          <section>
            <h2>4. Steam OpenID ve Üçüncü Taraf</h2>
            <p>
              Sitemiz kimlik doğrulama için Valve Corporation'ın Steam OpenID hizmetini kullanır.
              Steam giriş sayfasında Valve'in kendi çerez ve gizlilik politikaları geçerlidir.
              Valve'in politikasını{" "}
              <a
                href="https://store.steampowered.com/privacy_agreement/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                buradan
              </a>{" "}
              inceleyebilirsiniz.
            </p>
          </section>

          <section>
            <h2>5. Çerez Tercihlerinizi Yönetme</h2>
            <p>
              Sayfanın alt kısmında yer alan <strong className="text-foreground">çerez bildirimi</strong> üzerinden
              tercihlerinizi istediğiniz zaman güncelleyebilirsiniz. Tarayıcı ayarlarından da tüm çerezleri silebilir
              veya engelleyebilirsiniz; ancak bu durumda sitenin bazı işlevleri çalışmayabilir.
            </p>
          </section>

          <section>
            <h2>6. KVKK Kapsamında Haklarınız</h2>
            <p>
              6698 sayılı Kişisel Verilerin Korunması Kanunu uyarınca kişisel verilerinize ilişkin;
              bilgi alma, düzeltme, silme, işlemeye itiraz etme ve veri taşınabilirliği haklarına sahipsiniz.
              Talepleriniz için:{" "}
              <a href="mailto:support@skinapex.net" className="text-primary hover:underline">
                support@skinapex.net
              </a>
            </p>
          </section>

          <section>
            <h2>7. İletişim</h2>
            <p>
              Çerez politikamıza ilişkin sorularınız için{" "}
              <a href="mailto:support@skinapex.net" className="text-primary hover:underline">
                support@skinapex.net
              </a>{" "}
              adresine ulaşabilirsiniz.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
