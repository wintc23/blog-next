'use client'
import { useEffect, useRef, useState } from 'react'
import { App, Button, Spin } from 'antd'
import { z } from 'zod'
import { apiFetch } from '@/lib/api/client'
import { IMAGE_UPLOAD_ACCEPT, IMAGE_FORMAT_HINT } from '@/lib/image-formats'
import { useImagePaste } from '@/lib/use-image-paste'
import { uploadToolImage } from '@/lib/image-tools'
import styles from './Tools.module.css'
const schema = z.object({ name: z.string(), count: z.number(), maxImages: z.number() })
export default function PhoneUpload() {
  const { message } = App.useApp()
  const [token, setToken] = useState(''), [info, setInfo] = useState<z.infer<typeof schema> | null>(null)
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [done, setDone] = useState<string[]>([])
  const input = useRef<HTMLInputElement>(null), uploading = useRef(false)
  useEffect(() => { const value = window.location.hash.slice(1); setToken(value); if (!value) setError('请扫描原设备上的上传二维码') }, [])
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const poll = () => { if (!uploading.current) void apiFetch('/image-upload-session/', { headers: { 'X-Image-Upload-Token': token }, schema, signal: controller.signal }).then(result => { setInfo(result); setError('') }).catch(error => { if (!controller.signal.aborted) setError(error.message) }) }
    poll(); const timer = setInterval(poll, 5000)
    return () => { controller.abort(); clearInterval(timer) }
  }, [token])
  const upload = async (files: File[]) => {
        if (uploading.current || !info || !token || !files.length) return
        if (files.length + info.count > info.maxImages) { setError(`最多上传 ${info.maxImages} 张图片`); return }
        uploading.current = true; setBusy(true)
        try { for (const file of files) { await uploadToolImage(file, undefined, token, text => message.info({ key: 'image-upload-preparation', content: text })); setDone(names => [...names, file.name]); setInfo(value => value ? { ...value, count: value.count + 1 } : value) } }
        catch (error) { setError(error instanceof Error ? error.message : '上传失败') }
        finally { uploading.current = false; setBusy(false) }
  }
  useImagePaste(!!info && !!token && !busy && !error, files => { void upload(files) })
  return <div className={styles.shell}><div className={styles.hero}><h1>{info?.name || '从手机上传'}</h1><p>选好的照片会自动出现在原设备，上传不会自动开始生成。</p></div><div className={styles.panel}>
    {error ? <p role="alert" className={styles.error}>{error}</p> : !info ? <Spin /> : <><p>任务中已有 {info.count} / {info.maxImages} 张图片</p>
      <input ref={input} type="file" className="hidden" accept={IMAGE_UPLOAD_ACCEPT} multiple aria-label="选择上传照片" onChange={async event => {
        const files = Array.from(event.target.files || []); event.target.value = ''
        void upload(files)
      }} />
      <Button size="large" type="primary" loading={busy} disabled={info.count >= info.maxImages} onClick={() => input.current?.click()}>从相册选择</Button><p className={styles.hint}>{IMAGE_FORMAT_HINT}</p>
      <div role="status">{done.map((name, index) => <p key={index}>✓ {name} 已上传</p>)}</div>{done.length > 0 && <p>可以继续添加，也可以回到原设备开始生成。</p>}</>}
  </div></div>
}
