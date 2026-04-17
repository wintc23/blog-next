'use client'

import { useEffect, useRef } from 'react'
// BlockNote core styles — required so the full-HTML output saved by
// the editor (`.bn-block-outer`, `.bn-block-content`, `[data-text-color]`,
// `[data-text-alignment]`, etc.) renders with the correct visual
// styles on the read-only article page, without loading the editor
// runtime.
import '@blocknote/core/style.css'

interface Props {
  html: string
  onOutlineChange?: (items: { title: string; id: string; level: number }[]) => void
}

/**
 * Read-only article renderer. Syntax highlighting runs server-side
 * (`lib/highlight-code.ts`) so by the time the HTML reaches us it
 * already contains shiki-coloured `<pre>` blocks — no client shiki
 * runtime, no flash-of-unstyled-code. This component only renders the
 * HTML and extracts outline items for the sidebar TOC.
 */
export default function ArticleContent({ html, onOutlineChange }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || !onOutlineChange) return
    const items: { title: string; id: string; level: number }[] = []
    ref.current.querySelectorAll('h1, h2, h3, h4').forEach((node, i) => {
      const el = node as HTMLElement
      if (!el.id) el.id = `h-${i}`
      items.push({
        title: el.innerText,
        id: el.id,
        level: Number(el.tagName.substring(1)),
      })
    })
    onOutlineChange(items)
  }, [html, onOutlineChange])

  return (
    <div
      ref={ref}
      className="markdown-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
