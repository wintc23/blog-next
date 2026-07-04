import { BASE_URL } from '@/lib/config'
import { apiFetch } from './client'

export interface AiAttachment {
  id?: number
  messageId?: number
  fileKey: string
  fileUrl: string
  mimeType: string
  size: number
  name?: string
}

export interface AiMessage {
  id: number
  sessionId: number
  role: 'user' | 'assistant' | 'system' | 'tool' | 'error'
  content: string
  contentType: string
  status: string
  metadata?: Record<string, unknown>
  createdAt: number
  attachments: AiAttachment[]
}

export interface AiSession {
  id: number
  title: string
  codexSessionId?: string | null
  status: string
  pinned?: boolean
  createdAt: number
  updatedAt: number
  lastMessageAt?: number | null
}

export interface AiAccessKey {
  id: number
  name: string
  keyPreview: string
  enabled: boolean
  usageLimit?: number | null
  usageCount: number
  expiresAt?: number | null
  createdAt?: number | null
  lastUsedAt?: number | null
  key?: string
}

export function resolveAiFileUrl(fileUrl: string) {
  if (!fileUrl) return ''
  if (/^https?:\/\//.test(fileUrl)) return fileUrl
  return `${BASE_URL}${fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`}`
}

function getAiToken() {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('ai_chat_token') || ''
}

export function setAiToken(token: string) {
  localStorage.setItem('ai_chat_token', token)
}

export function clearAiToken() {
  localStorage.removeItem('ai_chat_token')
}

export function aiLogin(key: string) {
  return apiFetch('/ai/auth', {
    method: 'POST',
    data: { key },
  }) as Promise<{ token: string; expiresIn: number }>
}

export function listAiSessions() {
  return apiFetch('/ai/sessions', {
    token: getAiToken(),
  }) as Promise<{ list: AiSession[] }>
}

export function createAiSession(title = '新的会话') {
  return apiFetch('/ai/sessions', {
    method: 'POST',
    token: getAiToken(),
    data: { title },
  }) as Promise<AiSession>
}

export function renameAiSession(id: number, title: string) {
  return apiFetch(`/ai/sessions/${id}`, {
    method: 'PATCH',
    token: getAiToken(),
    data: { title },
  }) as Promise<AiSession>
}

export function setAiSessionPinned(id: number, pinned: boolean) {
  return apiFetch(`/ai/sessions/${id}`, {
    method: 'PATCH',
    token: getAiToken(),
    data: { pinned },
  }) as Promise<AiSession>
}

export function deleteAiSession(id: number) {
  return apiFetch(`/ai/sessions/${id}`, {
    method: 'DELETE',
    token: getAiToken(),
  })
}

export function stopAiSession(id: number) {
  return apiFetch(`/ai/sessions/${id}/stop`, {
    method: 'POST',
    token: getAiToken(),
  })
}

export function getAiQiniuToken(sessionId: number, filename: string) {
  return apiFetch('/ai/qiniu-token', {
    method: 'POST',
    token: getAiToken(),
    data: { sessionId, filename },
  }) as Promise<{
    fileKey: string
    qiniuKey: string
    token: string
    uploadUrl: string
    fileUrl: string
  }>
}

export function listAiMessages(sessionId: number) {
  return apiFetch(`/ai/sessions/${sessionId}/messages`, {
    token: getAiToken(),
  }) as Promise<{ list: AiMessage[] }>
}

export function sendAiMessage(
  sessionId: number,
  data: { content: string; attachments: AiAttachment[] },
  signal?: AbortSignal,
) {
  return apiFetch(`/ai/sessions/${sessionId}/messages`, {
    method: 'POST',
    token: getAiToken(),
    data,
    signal,
  }) as Promise<{
    session: AiSession
    userMessage: AiMessage
    assistantMessage: AiMessage
  }>
}

export async function uploadAiAttachment(sessionId: number, file: File) {
  const token = getAiToken()
  const qiniu = await getAiQiniuToken(sessionId, file.name)
  const qiniuBody = new FormData()
  qiniuBody.append('token', qiniu.token)
  qiniuBody.append('key', qiniu.qiniuKey)
  qiniuBody.append('file', file)
  const qiniuRes = await fetch(qiniu.uploadUrl, {
    method: 'POST',
    body: qiniuBody,
  })
  if (!qiniuRes.ok) throw new Error('上传七牛失败')

  const body = new FormData()
  body.append('session_id', String(sessionId))
  body.append('file_key', qiniu.fileKey)
  body.append('file_url', qiniu.fileUrl)
  body.append('file', file)
  const res = await fetch(`${BASE_URL}/ai/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.message || '上传失败')
  return {
    fileKey: data.file_key,
    fileUrl: resolveAiFileUrl(data.file_url),
    mimeType: data.mime_type,
    size: data.size,
  } as AiAttachment
}

export function listManageAiKeys() {
  return apiFetch('/manage/ai-keys') as Promise<{ list: AiAccessKey[] }>
}

export function createManageAiKey(data: {
  name: string
  enabled: boolean
  usageLimit?: number | null
  expiresAt?: string | null
}) {
  return apiFetch('/manage/ai-keys', {
    method: 'POST',
    data,
  }) as Promise<AiAccessKey>
}

export function updateManageAiKey(
  id: number,
  data: Partial<Pick<AiAccessKey, 'name' | 'enabled' | 'usageLimit'>> & {
    expiresAt?: string | null
  },
) {
  return apiFetch(`/manage/ai-keys/${id}`, {
    method: 'PATCH',
    data,
  }) as Promise<AiAccessKey>
}

export function deleteManageAiKey(id: number) {
  return apiFetch(`/manage/ai-keys/${id}`, {
    method: 'DELETE',
  })
}
