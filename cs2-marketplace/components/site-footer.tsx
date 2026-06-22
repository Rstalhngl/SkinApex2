import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/50 px-4 py-6 text-center text-xs text-muted-foreground md:px-[4%]">
      <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <Link href="/kullanim-kosullari" className="hover:text-foreground">
          Kullanım Koşulları
        </Link>
        <Link href="/p2p-satici-sozlesmesi" className="hover:text-foreground">
          P2P Satıcı Sözleşmesi
        </Link>
        <Link href="/gizlilik-politikasi" className="hover:text-foreground">
          KVKK / Gizlilik
        </Link>
        <Link href="/on-bilgilendirme-formu" className="hover:text-foreground">
          Ön Bilgilendirme
        </Link>
        <Link href="/mesafeli-satis-sozlesmesi" className="hover:text-foreground">
          Mesafeli Satış (MSS)
        </Link>
        <Link href="/cerez-politikasi" className="hover:text-foreground">
          Çerez Politikası
        </Link>
      </nav>
      <p className="mt-3">© {new Date().getFullYear()} SkinApex</p>
    </footer>
  )
}
