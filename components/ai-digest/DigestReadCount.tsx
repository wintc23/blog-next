'use client'

import { useEffect, useRef, useState } from 'react'
import { EyeOutlined } from '@ant-design/icons'
import { z } from 'zod'
import { apiFetch } from '@/lib/api/client'
import { formatCount } from '@/lib/utils'

const resultSchema = z.object({ readTimes: z.number().int().nonnegative(), counted: z.boolean() })
type Result = z.infer<typeof resultSchema>

export default function DigestReadCount({ id, initialCount, track }: { id: number; initialCount: number; track: boolean }) {
  const [result, setResult] = useState<{ id: number; count: number } | null>(null)
  const request = useRef<{ id: number; promise: Promise<Result> } | null>(null)

  useEffect(() => {
    if (!track) return
    let active = true
    const record = () => {
      // Count the first visible activation, including a background tab opened later.
      if (document.visibilityState !== 'visible') return
      // Share the request across Strict Mode setup/cleanup and visibility changes.
      if (request.current?.id !== id) {
        request.current = { id, promise: apiFetch(`/ai-digests/${id}/read/`, { method: 'POST', schema: resultSchema }) }
      }
      void request.current.promise.then(value => {
        if (active) setResult({ id, count: value.readTimes })
      }).catch(() => { /* Analytics failures must not interrupt reading. */ })
    }
    document.addEventListener('visibilitychange', record)
    record()
    return () => {
      active = false
      document.removeEventListener('visibilitychange', record)
    }
  }, [id, track])

  const count = result?.id === id ? result.count : initialCount
  return <span title={`${count} 次阅读`}><EyeOutlined aria-hidden />{formatCount(count)} 次阅读</span>
}
