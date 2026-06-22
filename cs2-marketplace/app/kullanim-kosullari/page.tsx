import type { Metadata } from "next"
import { LegalDocView } from "@/components/legal-doc-view"
import { readLegalDoc } from "@/lib/legal-docs"

export const metadata: Metadata = {
  title: "Kullanım Koşulları — SkinApex",
  description: "SkinApex kullanıcı sözleşmesi.",
}

export default async function Page() {
  const content = await readLegalDoc("kullanim-kosullari")
  return <LegalDocView title="Kullanıcı Sözleşmesi" updatedAt="Haziran 2025" content={content} />
}
