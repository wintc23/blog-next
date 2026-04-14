'use client'

import { useEffect, useRef } from 'react'
import Prism from 'prismjs'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-yaml'

interface Props {
  html: string
  onOutlineChange?: (items: { title: string; id: string; level: number }[]) => void
}

export default function ArticleContent({ html, onOutlineChange }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    Prism.highlightAllUnder(ref.current)

    if (onOutlineChange) {
      const items: { title: string; id: string; level: number }[] = []
      const nodes = ref.current.querySelectorAll('h1, h2, h3, h4')
      nodes.forEach((node, i) => {
        const el = node as HTMLElement
        if (!el.id) el.id = `h-${i}`
        items.push({
          title: el.innerText,
          id: el.id,
          level: Number(el.tagName.substring(1)),
        })
      })
      onOutlineChange(items)
    }
  }, [html, onOutlineChange])

  return (
    <div
      ref={ref}
      className="markdown-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
