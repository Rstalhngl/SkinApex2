import { promises as fs } from "fs"
import path from "path"

const LEGAL_DIR = path.join(process.cwd(), "content", "legal")

export type LegalDocSlug =
  | "kullanim-kosullari"
  | "p2p-satici-sozlesmesi"
  | "kvkk-gizlilik"
  | "on-bilgilendirme-formu"
  | "mesafeli-satis-sozlesmesi"

export async function readLegalDoc(slug: LegalDocSlug): Promise<string> {
  const filePath = path.join(LEGAL_DIR, `${slug}.md`)
  return fs.readFile(filePath, "utf-8")
}
