'use client'

import { useState } from 'react'
import { Button } from 'antd'
import CommentImagePreview from '@/components/CommentImagePreview'
import type { MomentImage } from '@/lib/schemas/personal-profile'
import styles from './LifeMoments.module.css'

export default function MomentGallery({ images }: { images: MomentImage[] }) {
  const [active, setActive] = useState<number | null>(null)
  if (!images.length) return null
  return <>
    <div className={`${styles.gallery} ${images.length === 1 ? styles.singleImage : ''}`}>
      {images.map((picture, index) => <figure key={index}>
        <Button type="text" className={styles.photoButton} aria-label={`查看大图：${picture.description || `第 ${index + 1} 张照片`}`} aria-haspopup="dialog"
          onClick={() => setActive(index)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={picture.url} alt={picture.description || `动态照片 ${index + 1}`} width={640} height={480} loading="lazy" decoding="async" />
        </Button>
        {picture.description && <figcaption>{picture.description}</figcaption>}
      </figure>)}
    </div>
    <CommentImagePreview images={images.map(image => ({ url: image.url, alt: image.description || '' }))} current={active} onChange={setActive} />
  </>
}
