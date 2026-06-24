import type { Metadata } from "next"
import { LegalDocView } from "@/components/legal-doc-view"
import { readLegalDoc } from "@/lib/legal-docs"

export const metadata: Metadata = {
  title: "P2P Satıcı Sözleşmesi — SkinApex",
  description: "P2P satıcı sözleşmesi.",
}

export default async function Page() {
  const content = await readLegalDoc("p2p-satici-sozlesmesi")
  return <LegalDocView title="P2P Satıcı Sözleşmesi" updatedAt="Haziran 2025" content={content} />
}
