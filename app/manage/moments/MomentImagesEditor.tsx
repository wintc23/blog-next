'use client'
import { useEffect, useRef, useState } from 'react'
import { App, Button, Image } from 'antd'
import { PlusOutlined, CloseOutlined } from '@ant-design/icons'
import type { MomentImage } from '@/lib/schemas/personal-profile'
import { uploadImage } from '@/lib/upload'
import { useImagePaste } from '@/lib/use-image-paste'
import { IMAGE_UPLOAD_ACCEPT } from '@/lib/image-formats'
import { readPhotoMetadata, type PhotoMetadata } from '@/lib/photo-metadata'
import PhotoMetadataPicker from './PhotoMetadataPicker'
import PhotoVisibilityButton from '@/components/PhotoVisibilityButton'
import { PhotoSort, SortablePhoto } from '@/components/PhotoSort'
import styles from './MomentsManager.module.css'

export default function MomentImagesEditor({ value = [], onChange, disabled, active = true, onUploadingChange, onApplyMetadata, onInteractionChange }: {
  value?: MomentImage[]; onChange?: (images: MomentImage[]) => void; disabled?: boolean; active?: boolean
  onInteractionChange?: (active: boolean) => void
  onUploadingChange: (uploading: boolean) => void; onApplyMetadata: (value: PhotoMetadata) => void
}) {
  const { message } = App.useApp()
  const input = useRef<HTMLInputElement>(null), list = useRef<HTMLDivElement>(null), busy = useRef(false)
  const latest = useRef(value); latest.current = value
  const [uploading, setUploading] = useState(false), [preview, setPreview] = useState<number | null>(null)
  const [sorting, setSorting] = useState(false)
  useEffect(() => { onInteractionChange?.(sorting || preview !== null); return () => onInteractionChange?.(false) }, [sorting, preview, onInteractionChange])
  const [metadata, setMetadata] = useState<Record<string, PhotoMetadata>>({})
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
        const photoMetadata = await readPhotoMetadata(file)
        const ready = await prepareToolImage(file, { maxBytes: 5 * 1024 * 1024, maxPixels: 24_000_000, maxEdge: 12000, processingMaxEdge: 2048 }, text => message.info({ key: 'moment-upload', content: text }))
        const url = await uploadImage(ready)
        setMetadata(values => ({ ...values, [url]: photoMetadata }))
        change([...latest.current, { url, description: '' }])
      }
    } catch (e) { message.error(e instanceof Error ? e.message : '上传失败，请重试') }
    finally { busy.current = false; setUploading(false); onUploadingChange(false) }
  }
  useImagePaste(active && !locked && preview === null, files => { void upload(files) }, true)
  return <><Image.PreviewGroup items={value.map(p => p.url)} preview={{ visible: preview !== null, current: preview ?? 0, onVisibleChange: visible => { if (!visible) setPreview(null) }, onChange: setPreview }} />
    <PhotoSort onDraggingChange={setSorting} ids={value.map((picture, index) => `${picture.url}#${value.slice(0, index).filter(p => p.url === picture.url).length}`)} disabled={locked || !active} onMove={move} preview={id => {
      const picture = value.find(p => id.startsWith(`${p.url}#`))
      // eslint-disable-next-line @next/next/no-img-element
      return picture ? <img src={picture.url} alt="拖动中的照片" /> : null
    }}><div ref={list} className={styles.composerPhotos} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); void upload(Array.from(e.dataTransfer.files)) }}>
      {value.map((picture, index) => { const id = `${picture.url}#${value.slice(0, index).filter(p => p.url === picture.url).length}`; return <SortablePhoto key={id} id={id} className={styles.composerPhoto} disabled={locked || !active}>{({ attributes, listeners, setActivatorNodeRef }) => <>
        <Button type="text" ref={setActivatorNodeRef} {...attributes} {...listeners} className={styles.photoPreview} aria-label={`查看第 ${index + 1} 张图片，按住 200 毫秒拖动排序`} disabled={locked}
          onClick={() => setPreview(index)} onContextMenu={event => event.preventDefault()}>
          {/* eslint-disable-next-line @next/next/no-img-element */}<img src={picture.url} alt={picture.description || `图片 ${index + 1}`} draggable={false} />
        </Button><Button type="text" className={styles.removePhoto} icon={<span className={styles.removeSymbol}><CloseOutlined /></span>} aria-label={`删除第 ${index + 1} 张图片`} disabled={locked} onClick={() => change(value.filter((_, i) => i !== index))} />
        <PhotoVisibilityButton isPublic={picture.isPublic} disabled={locked} onChange={isPublic => change(value.map((p, i) => i === index ? { ...p, isPublic } : p))} />
      </>}</SortablePhoto> })}
      {value.length < 9 && <Button className={styles.addPhoto} type="dashed" icon={<PlusOutlined />} loading={uploading} disabled={locked} aria-label="添加动态图片" onClick={() => input.current?.click()} />}
    </div></PhotoSort><input ref={input} hidden style={{ display: 'none' }} type="file" accept={IMAGE_UPLOAD_ACCEPT} multiple onChange={e => { const files = Array.from(e.target.files || []); e.target.value = ''; void upload(files) }} />
    <p className={styles.photoHint}>最多 9 张，可粘贴图片；按住 200ms 拖动排序，右下角切换公开或隐藏。</p>
    <PhotoMetadataPicker images={value} metadata={metadata} disabled={locked || !active} onApply={onApplyMetadata} />
  </>
}
