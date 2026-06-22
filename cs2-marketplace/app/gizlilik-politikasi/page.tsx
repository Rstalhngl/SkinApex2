import type { Metadata } from "next"
import { LegalDocView } from "@/components/legal-doc-view"
import { readLegalDoc } from "@/lib/legal-docs"

export const metadata: Metadata = {
  title: "Gizlilik Politikası — SkinApex",
  description: "KVKK aydınlatma metni.",
}

export default async function Page() {
  const content = await readLegalDoc("kvkk-gizlilik")
  return <LegalDocView title="KVKK ve Gizlilik" updatedAt="Haziran 2025" content={content} />
}
