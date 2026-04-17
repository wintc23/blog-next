'use client'

import { useEffect, useRef } from 'react'
// BlockNote core styles + Inter font-face — together they give the
// read-only article page the exact same visual environment as the
// editor. We wrap the stored block HTML in `.bn-root bn-default-styles`
// (same class combo that sits at the root of the live editor), so
// heading sizes, paragraph margins, list markers, code block colours
// and inline typography all resolve via BlockNote's selectors. One
// source of truth for content typography = WYSIWYG with the editor,
// no parallel `.markdown-body` rules to maintain.
import '@blocknote/core/style.css'
import '@blocknote/core/fonts/inter.css'

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
      className="bn-container bn-root bn-default-styles"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
