import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { ReactNode } from "react"

function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part
  })
}

function renderMarkdown(content: string) {
  const lines = content.split("\n")
  const nodes: ReactNode[] = []
  let listItems: string[] = []
  let key = 0

  const flushList = () => {
    if (listItems.length === 0) return
    nodes.push(
      <ul key={key++} className="mt-2 list-disc space-y-1 pl-5">
        {listItems.map((item, idx) => (
          <li key={idx}>{renderInline(item)}</li>
        ))}
      </ul>,
    )
    listItems = []
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      flushList()
      continue
    }
    if (trimmed.startsWith("# ")) {
      flushList()
      nodes.push(
        <h1 key={key++} className="mb-2 text-3xl font-bold text-foreground">
          {trimmed.slice(2)}
        </h1>,
      )
      continue
    }
    if (trimmed.startsWith("## ")) {
      flushList()
      nodes.push(
        <h2 key={key++} className="mb-2 mt-8 text-base font-bold text-foreground">
          {trimmed.slice(3)}
        </h2>,
      )
      continue
    }
    if (trimmed.startsWith("### ")) {
      flushList()
      nodes.push(
        <h3 key={key++} className="mb-2 mt-4 text-sm font-bold text-foreground">
          {trimmed.slice(4)}
        </h3>,
      )
      continue
    }
    if (trimmed.startsWith("- ")) {
      listItems.push(trimmed.slice(2))
      continue
    }
    flushList()
    nodes.push(
      <p key={key++} className="leading-relaxed">
        {renderInline(trimmed)}
      </p>,
    )
  }
  flushList()
  return nodes
}

export function LegalDocView({
  title,
  updatedAt,
  content,
}: {
  title: string
  updatedAt: string
  content: string
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-8">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Ana Sayfaya Dön
        </Link>

        <h1 className="mb-2 text-3xl font-bold text-foreground">{title}</h1>
        <p className="mb-8 text-sm text-muted-foreground">Son güncelleme: {updatedAt}</p>

        <div className="space-y-4 text-sm text-muted-foreground">{renderMarkdown(content)}</div>
      </div>
    </div>
  )
}
