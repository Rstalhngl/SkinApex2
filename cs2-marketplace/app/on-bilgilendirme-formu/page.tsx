import type { Metadata } from "next"
import { LegalDocView } from "@/components/legal-doc-view"
import { readLegalDoc } from "@/lib/legal-docs"

export const metadata: Metadata = {
  title: "Ön Bilgilendirme Formu — SkinApex",
  description: "SkinApex ön bilgilendirme formu.",
}

export default async function OnBilgilendirmePage() {
  const content = await readLegalDoc("on-bilgilendirme-formu")
  return (
    <LegalDocView title="Ön Bilgilendirme Formu" updatedAt="Haziran 2025" content={content} />
  )
}
