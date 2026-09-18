'use client'

import { Image } from 'antd'
import type { CommentImage } from '@/lib/rich-content'

export default function CommentImagePreview({ images, current, onChange }: {
  images: CommentImage[]; current: number | null; onChange: (current: number | null) => void
}) {
  return <Image.PreviewGroup
    items={images.map((image, index) => ({ src: image.url, alt: image.alt || `图片 ${index + 1}`, referrerPolicy: 'no-referrer' }))}
    preview={{
      visible: current !== null,
      current: current ?? 0,
      onChange: index => onChange(index),
      onVisibleChange: visible => { if (!visible) onChange(null) },
    }}
  />
}
