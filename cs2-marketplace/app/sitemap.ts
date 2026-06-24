import type { MetadataRoute } from "next"

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://skinapex.net"

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/kullanim-kosullari",
    "/gizlilik-politikasi",
    "/on-bilgilendirme-formu",
    "/mesafeli-satis-sozlesmesi",
    "/p2p-satici-sozlesmesi",
    "/cerez-politikasi",
  ]

  return routes.map((path) => ({
    url: `${BASE}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "hourly" : "monthly",
    priority: path === "" ? 1 : 0.5,
  }))
}
