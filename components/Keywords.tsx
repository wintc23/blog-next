'use client'

import { Tag } from 'antd'
import { useState, type KeyboardEvent } from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

/**
 * Tag-style keyword input. Mirrors blog-ssr's Keywords.vue:
 *  - Enter commits the current input as a new tag
 *  - Backspace on empty input removes the last tag
 *  - Tags display with a close button
 * Value is serialized back to a comma-joined string so the backend contract
 * (`keywords: string`) stays unchanged.
 */
export default function Keywords({ value, onChange, placeholder }: Props) {
  const words = value ? value.split(',').filter(Boolean) : []
  const [draft, setDraft] = useState('')

  const commit = (list: string[]) => onChange(list.join(','))

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const t = draft.trim()
      if (!t) return
      commit([...words, t])
      setDraft('')
    } else if (e.key === 'Backspace' && !draft && words.length) {
      commit(words.slice(0, -1))
    }
  }

  const remove = (idx: number) => commit(words.filter((_, i) => i !== idx))

  return (
    <div className="flex min-h-[34px] flex-wrap items-center gap-1 rounded border border-[#d9d9d9] px-2 py-1 focus-within:border-[#4096ff] focus-within:shadow-[0_0_0_2px_rgba(5,145,255,0.1)]">
      {words.map((w, i) => (
        <Tag key={i} closable onClose={() => remove(i)} color="blue">
          {w}
        </Tag>
      ))}
      <input
        className="min-w-[80px] flex-1 border-none bg-transparent text-sm outline-none"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={words.length ? '' : placeholder || '输入关键词后回车'}
      />
    </div>
  )
}
