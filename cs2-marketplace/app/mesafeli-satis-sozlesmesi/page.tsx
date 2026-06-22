import type { Metadata } from "next"
import { LegalDocView } from "@/components/legal-doc-view"
import { readLegalDoc } from "@/lib/legal-docs"

export const metadata: Metadata = {
  title: "Mesafeli Satış Sözleşmesi — SkinApex",
  description: "SkinApex mesafeli satış sözleşmesi (MSS).",
}

export default async function MesafeliSatisPage() {
  const content = await readLegalDoc("mesafeli-satis-sozlesmesi")
  return (
    <LegalDocView title="Mesafeli Satış Sözleşmesi (MSS)" updatedAt="Haziran 2025" content={content} />
  )
}
