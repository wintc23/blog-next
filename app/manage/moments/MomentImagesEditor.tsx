'use client'
import { useRef, useState } from 'react'
import { App, Button, Image } from 'antd'
import { PlusOutlined, CloseOutlined } from '@ant-design/icons'
import type { MomentImage } from '@/lib/schemas/personal-profile'
import { uploadImage } from '@/lib/upload'
import { useImagePaste } from '@/lib/use-image-paste'
import { IMAGE_UPLOAD_ACCEPT } from '@/lib/image-formats'
import styles from './MomentsManager.module.css'

export default function MomentImagesEditor({ value = [], onChange, disabled, active = true, onUploadingChange }: {
  value?: MomentImage[]; onChange?: (images: MomentImage[]) => void; disabled?: boolean; active?: boolean
  onUploadingChange: (uploading: boolean) => void
}) {
  const { message } = App.useApp()
  const input = useRef<HTMLInputElement>(null), list = useRef<HTMLDivElement>(null), busy = useRef(false)
  const latest = useRef(value); latest.current = value
  const drag = useRef<number | null>(null), start = useRef({ x: 0, y: 0 }), moved = useRef(false)
  const [uploading, setUploading] = useState(false), [preview, setPreview] = useState<number | null>(null)
  const locked = disabled || uploading
  const change = (images: MomentImage[]) => { latest.current = images; onChange?.(images) }
  const move = (from: number, to: number) => { if (locked || from === to || to < 0 || to >= latest.current.length) return; const images = [...latest.current]; images.splice(to, 0, images.splice(from, 1)[0]); change(images) }
  const upload = async (files: File[]) => {
    if (disabled || busy.current || !files.length) return
    const remaining = 9 - latest.current.length
    if (files.length > remaining) { message.warning('每条动态最多 9 张图片'); return }
    busy.current = true; setUploading(true); onUploadingChange(true)
    try {
      const { prepareToolImage } = await import('@/lib/prepare-tool-image')
      for (const file of files) {
        const ready = await prepareToolImage(file, { maxBytes: 5 * 1024 * 1024, maxPixels: 24_000_000, maxEdge: 12000, processingMaxEdge: 2048 }, text => message.info({ key: 'moment-upload', content: text }))
        change([...latest.current, { url: await uploadImage(ready), description: '' }])
      }
    } catch (e) { message.error(e instanceof Error ? e.message : '上传失败，请重试') }
    finally { busy.current = false; setUploading(false); onUploadingChange(false) }
  }
  useImagePaste(active && !locked && preview === null, files => { void upload(files) }, true)
  return <><Image.PreviewGroup items={value.map(p => p.url)} preview={{ visible: preview !== null, current: preview ?? 0, onVisibleChange: visible => { if (!visible) setPreview(null) }, onChange: setPreview }} />
    <div ref={list} className={styles.composerPhotos} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); void upload(Array.from(e.dataTransfer.files)) }}
      onPointerMove={e => { if (drag.current === null || locked) return; if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 6) moved.current = true; const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-photo-index]'); if (target && list.current?.contains(target)) { const next = Number(target.dataset.photoIndex); move(drag.current, next); drag.current = next } }}
      onPointerUp={() => { if (drag.current !== null && !moved.current) setPreview(drag.current); drag.current = null }} onPointerCancel={() => { drag.current = null }}>
      {value.map((picture, index) => <div key={`${picture.url}-${index}`} className={styles.composerPhoto} data-photo-index={index}>
        <Button type="text" className={styles.photoPreview} aria-label={`查看第 ${index + 1} 张图片，拖动可排序`} disabled={locked}
          onPointerDown={e => { if (!locked && e.button === 0) { drag.current = index; moved.current = false; start.current = { x: e.clientX, y: e.clientY }; list.current?.setPointerCapture(e.pointerId) } }}
          onKeyDown={e => { if (['ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); move(index, index + (e.key === 'ArrowLeft' ? -1 : 1)) } else if (['Enter', ' '].includes(e.key)) { e.preventDefault(); setPreview(index) } }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}<img src={picture.url} alt={picture.description || `图片 ${index + 1}`} draggable={false} />
        </Button><Button className={styles.removePhoto} shape="circle" size="small" icon={<CloseOutlined />} aria-label={`删除第 ${index + 1} 张图片`} disabled={locked} onClick={() => change(value.filter((_, i) => i !== index))} />
      </div>)}
      {value.length < 9 && <Button className={styles.addPhoto} type="dashed" icon={<PlusOutlined />} loading={uploading} disabled={locked} aria-label="添加动态图片" onClick={() => input.current?.click()} />}
    </div><input ref={input} hidden style={{ display: 'none' }} type="file" accept={IMAGE_UPLOAD_ACCEPT} multiple onChange={e => { const files = Array.from(e.target.files || []); e.target.value = ''; void upload(files) }} />
    <p className={styles.photoHint}>最多 9 张，可粘贴图片或拖动排序。</p>
  </>
}
