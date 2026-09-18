import { v4 as uuidv4 } from 'uuid'
import { getFileUploadToken } from './api/posts'
import { BASE_URL } from './config'
import { getTokenClient } from './utils'

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export async function uploadImage(file: Blob): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) throw new Error('每张图片最大 5 MB')
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('请上传静态 JPG、PNG 或 WebP 图片')
  }
  const token = getTokenClient()
  if (!token) throw new Error('请登录后上传图片')
  const form = new FormData()
  form.append('image', file, file instanceof File ? file.name : 'image')
  const response = await fetch(`${BASE_URL}/media/images/`, {
    method: 'POST', headers: { Authorization: token }, body: form,
  })
  const result = await response.json().catch(() => ({})) as { url?: string; message?: string }
  if (!response.ok || !result.url) throw new Error(result.message || '图片上传失败，请稍后重试')
  return result.url
}

export async function uploadToQiniu(file: Blob): Promise<string> {
  if (!file.type.startsWith('video/')) return uploadImage(file)
  if (file.size > 50 * 1024 * 1024) throw new Error('视频最大 50 MB')
  const filename = uuidv4().replace(/-/g, '')
  const { token, domain } = await getFileUploadToken(filename, 'video')
  const form = new FormData()
  form.append('file', file)
  form.append('token', token)
  form.append('key', filename)
  const res = await fetch('https://up-z2.qiniup.com/', {
    method: 'POST',
    body: form,
  })
  if (!res.ok) throw new Error('upload failed')
  const data = (await res.json()) as { key: string }
  return `${domain}/${data.key}`
}
