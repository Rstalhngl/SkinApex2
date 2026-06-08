import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "https://skinapex.net"
  const pages = ["", "gizlilik-politikasi", "kullanim-kosullari", "cerez-politikasi"]
  return pages.map((path) => ({
    url: path ? `${base}/${path}` : base,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path ? 0.5 : 1,
  }))
}
