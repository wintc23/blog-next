'use client'
import { useEffect, useState } from 'react'
import { Alert, Button, Spin } from 'antd'
import { apiFetch } from '@/lib/api/client'
import { ToolResult, type Tool } from '@/lib/image-tools'
import TaskScreen from './TaskScreen'
import { trackEvent } from '@/lib/stat-event'

export default function ToolScreen({ slug }: { slug: string }) {
  const [tool, setTool] = useState<Tool | null>(null)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  useEffect(() => { trackEvent('image_tool.view', { tool: slug }) }, [slug])
  useEffect(() => {
    const controller = new AbortController(); setError(''); setTool(null)
    apiFetch(`/image-tools/${encodeURIComponent(slug)}/`, { schema: ToolResult, signal: controller.signal })
      .then(value => setTool(value.tool))
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : '工具加载失败') })
    return () => controller.abort()
  }, [slug, reload])
  if (error) return <Alert type="error" message={error} action={<Button onClick={() => setReload(v => v + 1)}>重试</Button>} />
  return tool ? <TaskScreen tool={tool} /> : <Spin aria-label="加载图片工具" />
}
