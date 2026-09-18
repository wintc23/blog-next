import { z } from 'zod'
import { apiFetch } from './api/client'
import { BASE_URL } from './config'
import { getTokenClient } from './utils'

export const FieldSchema = z.object({ key: z.string(), label: z.string(), options: z.array(z.string()), default: z.string() })
export const ToolConfigSchema = z.object({
  name: z.string(), description: z.string(), coverUrl: z.string().optional(), mode: z.enum(['per_image', 'reference']), minImages: z.number(), maxImages: z.number(),
  maxOutputs: z.number(), defaultCount: z.number().default(1), ratios: z.array(z.string()), defaultRatio: z.string(), fields: z.array(FieldSchema),
  comparison: z.boolean(), promptRequired: z.boolean(), instruction: z.string().optional(),
})
export const ToolSchema = z.object({ slug: z.string(), version: z.number(), enabled: z.boolean(), position: z.number(), config: ToolConfigSchema })
export type Tool = z.infer<typeof ToolSchema>
export const AssetSchema = z.object({ id: z.string(), name: z.string(), width: z.number(), height: z.number(), size: z.number(), url: z.string() })
export type Asset = z.infer<typeof AssetSchema>
export const OptionsSchema = z.object({ prompt: z.string().optional(), ratio: z.string().optional(), count: z.number().optional(), fields: z.record(z.string(), z.string()).optional() })
export type Options = z.infer<typeof OptionsSchema>
export const ItemSchema = z.object({ id: z.string(), sourceId: z.string().nullable(), outputId: z.string().nullable(), previousId: z.string().nullable(), position: z.number(), status: z.string(), error: z.string().nullable() })
export const TaskSchema = z.object({ id: z.string(), toolSlug: z.string(), toolVersion: z.number(), config: ToolConfigSchema, options: OptionsSchema,
  quota: z.object({ exempt: z.boolean(), remaining: z.number().nullable(), globalPerMinute: z.number(), userPerHour: z.number(), retryAfter: z.number() }),
  status: z.string(), createdAt: z.string(), inputs: z.array(AssetSchema), outputs: z.array(AssetSchema), items: z.array(ItemSchema), sharing: z.boolean() })
export type Task = z.infer<typeof TaskSchema>
export const TaskResult = z.object({ task: TaskSchema })
export const ToolResult = z.object({ tool: ToolSchema, ready: z.boolean() })
export const ToolsResult = z.object({ tools: z.array(ToolSchema), ready: z.boolean() })
export const labels: Record<string, string> = { draft: '待生成', queued: '排队中', running: '生成中', completed: '已完成', failed: '未完成', partial: '部分完成', uncertain: '结果待确认', cancelled: '已取消' }
export const ratioLabels: Record<string, string> = { auto: '自动适配', '1:1': '方形 · 1:1', '3:2': '横向 · 3:2', '2:3': '竖向 · 2:3' }
export const assetUrl = (asset: Asset) => `${BASE_URL}${asset.url}`
export const loadTask = (id: string, signal?: AbortSignal) => apiFetch(`/image-tasks/${id}/`, { schema: TaskResult, signal })
export const mutateTask = (id: string, action: string, data: unknown = {}) => apiFetch(`/image-tasks/${id}/${action}`, { method: 'POST', data, schema: TaskResult })

export async function uploadToolImage(file: File, taskId?: string, handoff?: string) {
  if (file.size > 20 * 1024 * 1024) throw new Error(`${file.name} 超过 20 MB`)
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('请上传 JPG、PNG 或 WebP 图片；HEIC 照片请先导出为 JPG')
  const form = new FormData()
  form.append('image', file)
  const headers: Record<string, string> = handoff ? { 'X-Image-Upload-Token': handoff } : { Authorization: getTokenClient() || '' }
  const response = await fetch(`${BASE_URL}${handoff ? '/image-upload-session/' : `/image-tasks/${taskId}/assets/`}`, { method: 'POST', body: form, headers })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.message || '上传失败，请重试')
}

export async function downloadBlob(url: string, name: string, auth = false, share = false) {
  const headers: Record<string, string> = auth ? { Authorization: getTokenClient() || '' } : {}
  const response = await fetch(url, { headers })
  if (!response.ok) throw new Error('下载失败，请刷新任务后重试')
  const blob = await response.blob()
  if (share) {
    const file = new File([blob], name, { type: blob.type })
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] })
      return
    }
  }
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60000)
}

export type DeviceKind = 'desktop' | 'phone' | 'other'
/** Conservative: a narrow PC stays a PC, while touch tablets use the neutral entry. */
export function deviceKind(userAgent: string, touchPoints: number, finePointer: boolean): DeviceKind {
  if (/iPhone|iPod|Android.*Mobile|Windows Phone/i.test(userAgent)) return 'phone'
  if (/iPad|Tablet|Android/i.test(userAgent) || /Macintosh/i.test(userAgent) && touchPoints > 1) return 'other'
  return finePointer && /Windows|Macintosh|X11|Linux/i.test(userAgent) ? 'desktop' : 'other'
}

export const toolCover = (tool: Pick<Tool, 'slug' | 'config'>) => tool.config.coverUrl || `/images/tools/${['cartoon', 'restore', 'create'].includes(tool.slug) ? tool.slug : 'create'}.webp`
