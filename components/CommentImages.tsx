'use client'

import { CloseOutlined, LoadingOutlined, PlusOutlined } from '@ant-design/icons'
import { useId, useRef, useState } from 'react'
import type { CommentImage } from '@/lib/rich-content'
import CommentImagePreview from './CommentImagePreview'

export default function CommentImages({ images, onChange, disabled, onAdd, uploading = false }: {
  images: CommentImage[]; onChange: (images: CommentImage[]) => void; disabled?: boolean
  onAdd?: () => void; uploading?: boolean
}) {
  const list = useRef<HTMLOListElement>(null)
  const drag = useRef<{ index: number; pointerId: number; x: number; y: number; moved: boolean } | null>(null)
  const [dragged, setDragged] = useState<number | null>(null)
  const [preview, setPreview] = useState<number | null>(null)
  const latest = useRef(images)
  latest.current = images
  const instructionId = useId()
  const [announcement, setAnnouncement] = useState('')

  const move = (from: number, to: number) => {
    if (disabled || to < 0 || to >= latest.current.length || from === to) return
    const ordered = [...latest.current]
    ordered.splice(to, 0, ordered.splice(from, 1)[0])
    latest.current = ordered
    onChange(ordered)
    setAnnouncement(`图片已移到第 ${to + 1} 张`)
  }

  if (!images.length && !onAdd) return null
  return (
    <div>
      <p id={instructionId} className="sr-only">最多 6 张图片，每张不超过 5 MB。点击图片查看大图，拖拽图片调整顺序，也可聚焦图片后使用方向键排序。</p>
      <ol ref={list} aria-label="评论图片" className="m-0 flex list-none flex-wrap gap-3 p-0"
        onPointerMove={(event) => {
          const current = drag.current
          if (!current || event.pointerId !== current.pointerId) return
          if (!current.moved && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 6) return
          current.moved = true
          setDragged(current.index)
          const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-image-index]')
          if (!target || !list.current?.contains(target)) return
          const destination = Number(target.dataset.imageIndex)
          if (destination !== current.index) {
            move(current.index, destination)
            current.index = destination
            setDragged(destination)
          }
        }}
        onPointerUp={(event) => {
          const current = drag.current
          if (!current || event.pointerId !== current.pointerId) return
          if (!current.moved && !disabled) setPreview(current.index)
          drag.current = null
          setDragged(null)
        }}
        onPointerCancel={() => { drag.current = null; setDragged(null) }}
        onLostPointerCapture={() => { drag.current = null; setDragged(null) }}
      >
        {images.map((picture, index) => (
          <li key={`${picture.url}-${images.slice(0, index).filter((item) => item.url === picture.url).length}`} data-image-index={index} className={`relative h-24 w-24 flex-none rounded border bg-white ${dragged === index ? 'border-[var(--site-primary)] shadow-md opacity-70' : 'border-[var(--site-border)]'}`}>
            <button type="button" disabled={disabled} aria-label={`查看图片 ${index + 1}`} aria-haspopup="dialog" aria-describedby={instructionId}
              className="relative block h-full w-full touch-none cursor-zoom-in overflow-hidden rounded border-0 bg-[var(--site-bg)] p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--site-primary)] active:cursor-grabbing"
              onPointerDown={(event) => {
                if (disabled || !event.isPrimary || event.button !== 0) return
                list.current?.setPointerCapture(event.pointerId)
                drag.current = { index, pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false }
              }}
              onClick={(event) => { if (event.detail === 0) setPreview(index) }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); move(index, index - 1) }
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); move(index, index + 1) }
              }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={picture.url} alt={picture.alt || `图片 ${index + 1}`} draggable={false} className="pointer-events-none h-full w-full select-none object-contain" />
              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-xs text-white">{index + 1}</span>
            </button>
            <button type="button" disabled={disabled} aria-label={`移除图片 ${index + 1}`} title="移除图片"
              className="absolute -right-2 -top-2 grid h-6 w-6 cursor-pointer place-items-center rounded-full border border-white bg-[var(--site-text-secondary)] p-0 text-xs text-white shadow-sm hover:bg-[var(--site-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--site-primary)] disabled:opacity-40"
              onClick={() => onChange(images.filter((_, item) => item !== index))}><CloseOutlined aria-hidden="true" /></button>
          </li>
        ))}
        {onAdd && images.length < 6 && <li className="h-24 w-24 flex-none">
          <button type="button" onClick={onAdd} disabled={disabled || uploading} aria-label={uploading ? '正在上传图片' : '添加图片'} aria-describedby={instructionId}
            aria-busy={uploading} title="添加图片，每张不超过 5 MB，最多 6 张"
            className="grid h-full w-full cursor-pointer place-items-center rounded border border-dashed border-[var(--site-border)] bg-transparent p-0 text-2xl text-[var(--site-text-secondary)] hover:border-[var(--site-primary-hover)] hover:text-[var(--site-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--site-primary)] disabled:cursor-wait disabled:opacity-50">
            {uploading ? <LoadingOutlined aria-hidden="true" /> : <PlusOutlined aria-hidden="true" />}
          </button>
        </li>}
      </ol>
      <span role="status" className="sr-only">{announcement}</span>
      <CommentImagePreview images={images} current={preview} onChange={setPreview} />
    </div>
  )
}
