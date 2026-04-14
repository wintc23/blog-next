import { getFileUploadToken } from './api/posts'

export async function uploadToQiniu(file: Blob): Promise<string> {
  const filename = crypto.randomUUID().replace(/-/g, '')
  const { token, domain } = await getFileUploadToken(filename)
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
