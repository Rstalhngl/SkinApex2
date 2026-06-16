import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/50 px-4 py-6 text-center text-xs text-muted-foreground md:px-[4%]">
      <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <Link href="/kullanim-kosullari" className="hover:text-foreground">
          Kullanım Koşulları
        </Link>
        <Link href="/gizlilik-politikasi" className="hover:text-foreground">
          Gizlilik Politikası
        </Link>
        <Link href="/cerez-politikasi" className="hover:text-foreground">
          Çerez Politikası
        </Link>
      </nav>
      <p className="mt-3">© {new Date().getFullYear()} SkinApex</p>
    </footer>
  )
}
