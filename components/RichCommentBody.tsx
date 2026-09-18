'use client'

import { useState } from 'react'
import { parseRichContent, splitCommentBody } from '@/lib/rich-content'
import CommentImagePreview from './CommentImagePreview'

export default function RichCommentBody({ body }: { body: string }) {
  const [preview, setPreview] = useState<number | null>(null)
  const { text, images } = splitCommentBody(body)
  return (
    <div className="whitespace-pre-wrap break-words text-base leading-7 [overflow-wrap:anywhere]">
      {parseRichContent(text).map((part, index) => {
        if (part.type === 'link') return <a key={index} href={part.url} target="_blank" rel="ugc nofollow noopener noreferrer" className="text-[var(--site-primary)] underline underline-offset-2">{part.text || part.url}</a>
        if (part.type === 'strong') return <strong key={index}>{part.text}</strong>
        return <span key={index}>{part.text}</span>
      })}
      {images.length > 0 && <div className="mt-3 flex flex-wrap items-start gap-2" aria-label="评论图片">
        {images.map((picture, index) => <button type="button" key={`${picture.url}-${index}`} onClick={() => setPreview(index)} className="block max-w-full cursor-zoom-in rounded-lg border-0 bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--site-primary)]" aria-haspopup="dialog" aria-label={`查看图片 ${index + 1}：${picture.alt || '评论图片'}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={picture.url} alt={picture.alt || '评论图片'} loading="lazy" decoding="async" referrerPolicy="no-referrer" className={images.length === 1 ? 'max-h-[320px] max-w-full rounded-lg object-contain' : 'h-28 w-28 rounded-lg bg-[var(--site-bg)] object-contain sm:h-36 sm:w-36'} />
        </button>)}
      </div>}
      {images.length > 0 && <CommentImagePreview images={images} current={preview} onChange={setPreview} />}
    </div>
  )
}
