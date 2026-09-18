'use client'

import { useId, useRef, useState } from 'react'
import { App, Button, Input } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import type { MomentImage } from '@/lib/schemas/personal-profile'
import { safeLink } from '@/lib/rich-content'
import { uploadImage } from '@/lib/upload'
import styles from './MomentsManager.module.css'

export default function MomentImagesEditor({ value = [], onChange, disabled, onUploadingChange }: {
  value?: MomentImage[]; onChange?: (images: MomentImage[]) => void; disabled?: boolean
  onUploadingChange: (uploading: boolean) => void
}) {
  const { message } = App.useApp()
  const id = useId()
  const fileInput = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLOListElement>(null)
  const drag = useRef<number | null>(null)
  const latest = useRef(value)
  latest.current = value
  const busy = useRef(false)
  const [uploading, setUploading] = useState(false)
  const [address, setAddress] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const locked = disabled || uploading
  const change = (images: MomentImage[]) => { latest.current = images; onChange?.(images) }
  const move = (from: number, to: number) => {
    if (locked || to < 0 || to >= latest.current.length || from === to) return
    const images = [...latest.current]
    images.splice(to, 0, images.splice(from, 1)[0])
    change(images)
    setAnnouncement(`图片已移到第 ${to + 1} 张`)
  }
  const upload = async (files: File[]) => {
    if (disabled || busy.current || !files.length) return
    busy.current = true
    setUploading(true)
    onUploadingChange(true)
    const remaining = 9 - latest.current.length
    if (files.length > remaining) message.warning('每条动态最多 9 张图片，只上传可添加的部分')
    try {
      for (const file of files.slice(0, remaining)) {
        try { change([...latest.current, { url: await uploadImage(file), description: '' }]) }
        catch (cause) { message.error(cause instanceof Error ? cause.message : '图片上传失败，请重试') }
      }
    } finally {
      busy.current = false
      setUploading(false)
      onUploadingChange(false)
    }
  }
  const addAddress = () => {
    const url = address.trim()
    if (!safeLink(url) || url.length > 2048) { message.error('请填写有效的 HTTP 或 HTTPS 图片地址'); return }
    change([...value, { url, description: '' }])
    setAddress('')
  }

  return <div>
    <p id={`${id}-hint`} className={styles.photoHint}>最多 9 张，每张不超过 5 MB，支持 JPG、PNG、WebP。图片显示在文字下方，可拖拽缩略图或使用前移、后移按钮排序。</p>
    <ol ref={list} className={styles.imageList} aria-label="动态图片" aria-describedby={`${id}-hint`}>
      {value.map((picture, index) => <li key={`${picture.url}-${value.slice(0, index).filter((p) => p.url === picture.url).length}`} data-moment-image={index}>
        <button className={styles.dragPhoto} type="button" disabled={locked} aria-label={`调整第 ${index + 1} 张图片顺序`} aria-describedby={`${id}-hint`}
          onKeyDown={(event) => {
            if (['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].includes(event.key)) {
              event.preventDefault()
              move(index, index + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1))
            }
          }}
          onPointerDown={(event) => { if (!locked && event.isPrimary && event.button === 0) { drag.current = index; event.currentTarget.setPointerCapture(event.pointerId) } }}
          onPointerMove={(event) => {
            if (drag.current === null || locked || !event.isPrimary) return
            const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-moment-image]')
            if (target && list.current?.contains(target)) {
              const next = Number(target.dataset.momentImage)
              move(drag.current, next)
              drag.current = next
            }
          }}
          onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }} onLostPointerCapture={() => { drag.current = null }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={picture.url} alt={picture.description || `第 ${index + 1} 张图片`} width={88} height={88} draggable={false} />
        </button>
        <div className={styles.imageFields}>
          <label htmlFor={`${id}-description-${index}`}>图片 {index + 1} 描述（选填）</label>
          <Input.TextArea id={`${id}-description-${index}`} value={picture.description} disabled={locked} maxLength={200} rows={2}
            placeholder="描述画面或记录拍摄时的感受" onChange={(event) => change(value.map((p, i) => i === index ? { ...p, description: event.target.value } : p))} />
          <div className={styles.imageActions}>
            <Button size="small" disabled={locked || index === 0} aria-label={`前移第 ${index + 1} 张图片`} onClick={() => move(index, index - 1)}>前移</Button>
            <Button size="small" disabled={locked || index === value.length - 1} aria-label={`后移第 ${index + 1} 张图片`} onClick={() => move(index, index + 1)}>后移</Button>
            <Button size="small" disabled={locked} danger aria-label={`移除第 ${index + 1} 张图片`} onClick={() => change(value.filter((_, i) => i !== index))}>移除</Button>
          </div>
        </div>
      </li>)}
    </ol>
    <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden style={{ display: 'none' }} disabled={locked || value.length >= 9}
      onChange={(event) => { const files = Array.from(event.target.files || []); event.target.value = ''; void upload(files) }} />
    <Button icon={<UploadOutlined />} loading={uploading} disabled={locked || value.length >= 9} onClick={() => fileInput.current?.click()}>添加图片</Button>
    <details className={styles.addressDetails}>
      <summary>使用图片地址</summary>
      <label htmlFor={`${id}-url`}>图片地址</label>
      <div className={styles.addressInput}><Input id={`${id}-url`} inputMode="url" value={address} maxLength={2048} disabled={locked || value.length >= 9} onChange={(event) => setAddress(event.target.value)} />
        <Button disabled={locked || value.length >= 9 || !address.trim()} onClick={addAddress}>添加</Button></div>
    </details>
    <span className="sr-only" role="status">{announcement}</span>
  </div>
}
