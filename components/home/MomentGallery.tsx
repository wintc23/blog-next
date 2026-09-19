'use client'

import { useState } from 'react'
import { App, Button, Checkbox } from 'antd'
import { apiFetch } from '@/lib/api/client'
import { useUser } from '@/lib/store'
import PhotoVisibilityButton from '@/components/PhotoVisibilityButton'
import CommentImagePreview from '@/components/CommentImagePreview'
import type { MomentImage } from '@/lib/schemas/personal-profile'
import { useMomentSelection } from './MomentSelection'
import styles from './LifeMoments.module.css'

export default function MomentGallery({ images, momentId }: { images: MomentImage[]; momentId?: string }) {
  const selection = useMomentSelection(), user = useUser(), { message } = App.useApp()
  const [visibility, setVisibility] = useState<Record<string, boolean>>({}), [busy, setBusy] = useState(false)
  const [active, setActive] = useState<number | null>(null)
  if (!images.length) return null
  return <>
    <div className={`${styles.gallery} ${images.length === 1 ? styles.singleImage : images.length === 2 || images.length === 4 ? styles.twoColumns : ''}`}>
      {images.map((picture, index) => <figure key={index}>
        {selection?.active && momentId !== undefined && <Checkbox className={styles.photoSelect} checked={selection.has(momentId, index)} onChange={() => selection.toggle(momentId, index)} aria-label={`选择动态 ${momentId} 的第 ${index + 1} 张照片`} />}
        <div className={styles.galleryVisual}><Button type="text" className={styles.photoButton} aria-label={`查看大图：${picture.description || `第 ${index + 1} 张照片`}`} aria-haspopup="dialog"
          onClick={() => selection?.active && momentId !== undefined ? selection.toggle(momentId, index) : setActive(index)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={picture.url} alt={picture.description || `动态照片 ${index + 1}`} width={240} height={240} loading="lazy" decoding="async" />
        </Button>
        {user?.admin && momentId && <PhotoVisibilityButton isPublic={visibility[`${index}:${picture.url}`] ?? picture.isPublic} disabled={busy} onChange={async isPublic => {
          setBusy(true)
          try { await apiFetch(`/life-moments/${momentId}/images/visibility/`, { method: 'PATCH', data: { index, url: picture.url, isPublic } }); setVisibility(current => ({ ...current, [`${index}:${picture.url}`]: isPublic })); message.success(isPublic ? '已对访客公开' : '已对访客隐藏') }
          catch (error) { message.error(error instanceof Error ? error.message : '设置失败') }
          finally { setBusy(false) }
        }} />}
        </div>{picture.description && <figcaption>{picture.description}</figcaption>}
      </figure>)}
    </div>
    <CommentImagePreview images={images.map(image => ({ url: image.url, alt: image.description || '' }))} current={active} onChange={setActive} />
  </>
}
