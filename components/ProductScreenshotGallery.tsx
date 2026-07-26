'use client'

import { useEffect, useRef, useState } from 'react'
import type { ProductScreenshot } from '@/lib/schemas/product'

interface Props {
  productName: string
  accentColor: string
  screenshots: ProductScreenshot[]
  title?: string | null
  subtitle?: string | null
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={direction === 'left' ? 'm15 18-6-6 6-6' : 'm9 6 6 6-6 6'} />
    </svg>
  )
}

function getEmbedUrl(url: string) {
  try {
    const parsed = new URL(url)
    if (parsed.hostname === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0]
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (parsed.hostname.includes('youtube.com')) {
      const id = parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop()
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (parsed.hostname.includes('bilibili.com')) {
      const match = parsed.pathname.match(/\/(BV[a-zA-Z0-9]+)/)
      return match ? `https://player.bilibili.com/player.html?bvid=${match[1]}&autoplay=0` : null
    }
  } catch {}
  return null
}

function MediaContent({
  item,
  productName,
  index,
  className = '',
}: {
  item: ProductScreenshot
  productName: string
  index: number
  className?: string
}) {
  const isVideo = item.type === 'video'
  if (!isVideo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.url}
        alt={item.alt || `${productName} 截图 ${index + 1}`}
        className={className}
      />
    )
  }
  const embedUrl = getEmbedUrl(item.url)
  if (embedUrl) {
    return (
      <iframe
        src={embedUrl}
        title={item.alt || `${productName} 视频 ${index + 1}`}
        className={className}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
      />
    )
  }
  return (
    <video
      src={item.url}
      poster={item.poster || undefined}
      controls
      playsInline
      preload="metadata"
      className={className}
    >
      您的浏览器不支持视频播放。
    </video>
  )
}

export default function ProductScreenshotGallery({
  productName,
  accentColor,
  screenshots,
  title = '产品截图',
  subtitle = 'GALLERY',
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [preview, setPreview] = useState<number | null>(null)
  const hasMultiple = screenshots.length > 1

  useEffect(() => {
    if (preview === null) return
    const previous = document.body.style.overflow
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreview(null)
      if (event.key === 'ArrowLeft') {
        setPreview((value) =>
          value === null ? null : (value - 1 + screenshots.length) % screenshots.length,
        )
      }
      if (event.key === 'ArrowRight') {
        setPreview((value) =>
          value === null ? null : (value + 1) % screenshots.length,
        )
      }
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [preview, screenshots.length])

  const goTo = (index: number) => {
    const scroller = scrollerRef.current
    const card = scroller?.children[index] as HTMLElement | undefined
    if (!scroller || !card) return
    scroller.scrollTo({ left: card.offsetLeft - scroller.offsetLeft, behavior: 'smooth' })
    setActive(index)
  }

  const onScroll = () => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const center = scroller.scrollLeft + scroller.clientWidth / 2
    let closest = 0
    let distance = Number.POSITIVE_INFINITY
    Array.from(scroller.children).forEach((element, index) => {
      const card = element as HTMLElement
      const nextDistance = Math.abs(card.offsetLeft + card.clientWidth / 2 - center)
      if (nextDistance < distance) {
        closest = index
        distance = nextDistance
      }
    })
    setActive(closest)
  }

  return (
    <>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          {subtitle && (
            <div
              className="text-sm font-medium uppercase tracking-[0.14em]"
              style={{ color: accentColor }}
            >
              {subtitle}
            </div>
          )}
          {title && (
            <h2 className={`mb-0 text-2xl text-[#222] ${subtitle ? 'mt-2' : 'mt-0'}`}>
              {title}
            </h2>
          )}
        </div>
        {hasMultiple && (
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-[#999]">
              {String(active + 1).padStart(2, '0')} / {String(screenshots.length).padStart(2, '0')}
            </span>
            <div className="flex gap-2">
            <button
              type="button"
              aria-label="上一个媒体"
              onClick={() => goTo((active - 1 + screenshots.length) % screenshots.length)}
              className="flex h-9 w-9 cursor-pointer select-none items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-[#667085] transition duration-150 hover:border-[#b8c0cc] hover:bg-[#eef2f6] hover:text-[#222] active:scale-95 active:border-[#98a2b3] active:bg-[#dfe5ec] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d8cf0]/30"
            >
              <ChevronIcon direction="left" />
            </button>
            <button
              type="button"
              aria-label="下一个媒体"
              onClick={() => goTo((active + 1) % screenshots.length)}
              className="flex h-9 w-9 cursor-pointer select-none items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-[#667085] transition duration-150 hover:border-[#b8c0cc] hover:bg-[#eef2f6] hover:text-[#222] active:scale-95 active:border-[#98a2b3] active:bg-[#dfe5ec] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d8cf0]/30"
            >
              <ChevronIcon direction="right" />
            </button>
            </div>
          </div>
        )}
      </div>

      <div className="relative -mx-2 overflow-hidden px-2">
        <div
          ref={scrollerRef}
          onScroll={onScroll}
          className={`scroll-thin flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 ${
            hasMultiple ? 'pr-[12%] sm:pr-[18%]' : 'pr-0'
          }`}
        >
          {screenshots.map((screenshot, index) => (
            <figure
              key={`${screenshot.url}-${index}`}
              className={`m-0 snap-start ${
                hasMultiple ? 'min-w-[88%] sm:min-w-[82%] lg:min-w-[76%]' : 'min-w-full'
              }`}
            >
              <div
                className="group relative block w-full overflow-hidden rounded-xl border border-[#e8edf3] bg-[#f7faff] p-2 text-left shadow-[0_12px_35px_rgba(31,54,88,0.10)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(31,54,88,0.16)] sm:p-3"
                style={{ backgroundColor: `${accentColor}09` }}
              >
                <div className="mb-2 flex items-center gap-1.5 px-1 pt-0.5" aria-hidden="true">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b6b]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ffd43b]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#51cf66]" />
                  <span className="ml-2 h-2.5 flex-1 rounded-full bg-black/[0.05]" />
                </div>
                {screenshot.type === 'video' ? (
                  <MediaContent
                    item={screenshot}
                    productName={productName}
                    index={index}
                    className="aspect-video w-full rounded-lg border border-black/[0.04] bg-black object-contain"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setPreview(index)}
                    className="relative block w-full cursor-zoom-in overflow-hidden rounded-lg text-left"
                  >
                    <MediaContent
                      item={screenshot}
                      productName={productName}
                      index={index}
                      className="w-full rounded-lg border border-black/[0.04]"
                    />
                    <span className="absolute bottom-3 right-3 translate-y-2 rounded-full bg-black/70 px-3 py-1.5 text-xs text-white opacity-0 backdrop-blur transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      查看大图
                    </span>
                  </button>
                )}
              </div>
              <figcaption className="flex items-start gap-3 px-1 pt-3">
                <span className="font-mono text-sm font-bold" style={{ color: accentColor }}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="text-sm leading-6 text-[#777]">
                  {screenshot.caption || screenshot.alt}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      {hasMultiple && (
        <div className="mt-1 flex justify-center gap-2">
          {screenshots.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`查看第 ${index + 1} 个媒体`}
              onClick={() => goTo(index)}
              className="h-1.5 cursor-pointer rounded-full transition-all duration-300 hover:opacity-75 active:scale-90"
              style={{
                width: active === index ? 24 : 6,
                backgroundColor: active === index ? accentColor : '#d9dde3',
              }}
            />
          ))}
        </div>
      )}

      {preview !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="产品截图预览"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d1420]/90 p-4 backdrop-blur-sm sm:p-8"
          onClick={() => setPreview(null)}
        >
          <button
            type="button"
            aria-label="关闭预览"
            className="absolute right-4 top-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-xl text-white transition hover:bg-white/20 active:scale-95 active:bg-white/30 sm:right-8 sm:top-8"
            onClick={() => setPreview(null)}
          >
            ×
          </button>
          {hasMultiple && (
            <>
              <button
                type="button"
                aria-label="上一个媒体"
                className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 cursor-pointer select-none items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-xl backdrop-blur-md transition duration-150 hover:-translate-x-1 hover:-translate-y-1/2 hover:border-white/35 hover:bg-white/25 active:scale-95 active:border-white/45 active:bg-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:left-8 sm:h-14 sm:w-14"
                onClick={(event) => {
                  event.stopPropagation()
                  setPreview((preview - 1 + screenshots.length) % screenshots.length)
                }}
              >
                <ChevronIcon direction="left" />
              </button>
              <button
                type="button"
                aria-label="下一个媒体"
                className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 cursor-pointer select-none items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-xl backdrop-blur-md transition duration-150 hover:translate-x-1 hover:-translate-y-1/2 hover:border-white/35 hover:bg-white/25 active:scale-95 active:border-white/45 active:bg-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:right-8 sm:h-14 sm:w-14"
                onClick={(event) => {
                  event.stopPropagation()
                  setPreview((preview + 1) % screenshots.length)
                }}
              >
                <ChevronIcon direction="right" />
              </button>
            </>
          )}
          <figure className="m-0 max-w-[90vw]" onClick={(event) => event.stopPropagation()}>
            <MediaContent
              item={screenshots[preview]}
              productName={productName}
              index={preview}
              className="max-h-[82vh] max-w-full rounded-lg bg-black object-contain shadow-2xl"
            />
            {(screenshots[preview].caption || screenshots[preview].alt) && (
              <figcaption className="mt-4 text-center text-sm text-white/70">
                {screenshots[preview].caption || screenshots[preview].alt}
              </figcaption>
            )}
          </figure>
        </div>
      )}
    </>
  )
}
