'use client'

import Link from 'next/link'
import { Button, type GetRef } from 'antd'
import { useEffect, useId, useRef, useState } from 'react'
import { LeftOutlined, RightOutlined, PauseOutlined, CaretRightOutlined } from '@ant-design/icons'
import type { Product } from '@/lib/schemas/product'
import styles from './Home.module.css'

type CarouselProduct = Pick<Product, 'id' | 'name' | 'slug' | 'tagline' | 'summary' | 'platform' | 'statusLabel' | 'logoUrl' | 'coverUrl' | 'highlights'>

export default function ProductCarousel({ products }: { products: CarouselProduct[] }) {
  const viewport = useRef<HTMLDivElement>(null)
  const rotationButton = useRef<GetRef<typeof Button>>(null)
  const viewportId = useId()
  const [active, setActive] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [hovered, setHovered] = useState(false)
  const [visible, setVisible] = useState(false)
  const [pageVisible, setPageVisible] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(true)
  const count = products.length
  const rotating = count > 1 && playing && !hovered && visible && pageVisible && !reducedMotion

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotion = () => setReducedMotion(media.matches)
    const updateVisibility = () => setPageVisible(!document.hidden)
    updateMotion()
    updateVisibility()
    media.addEventListener('change', updateMotion)
    document.addEventListener('visibilitychange', updateVisibility)
    return () => {
      media.removeEventListener('change', updateMotion)
      document.removeEventListener('visibilitychange', updateVisibility)
    }
  }, [])

  useEffect(() => {
    const element = viewport.current
    if (!element) return
    const visibility = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.15 })
    visibility.observe(element)
    const slides = Array.from(element.children)
    const onSnap = (event: Event) => {
      const target = (event as Event & { snapTargetInline: Element | null }).snapTargetInline
      const index = target ? slides.indexOf(target) : -1
      if (index >= 0) setActive(index)
    }
    let fallback: IntersectionObserver | undefined
    if ('onscrollsnapchange' in element) {
      element.addEventListener('scrollsnapchange', onSnap)
    } else {
      fallback = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.intersectionRatio >= 0.6) setActive(slides.indexOf(entry.target))
        }
      }, { root: element, threshold: 0.6 })
      slides.forEach((slide) => fallback!.observe(slide))
    }
    return () => {
      visibility.disconnect()
      fallback?.disconnect()
      element.removeEventListener('scrollsnapchange', onSnap)
    }
  }, [count])

  useEffect(() => {
    if (!rotating) return
    const timer = window.setTimeout(() => {
      const element = viewport.current
      element?.scrollTo({ left: ((active + 1) % count) * element.clientWidth, behavior: 'smooth' })
    }, 6500)
    return () => window.clearTimeout(timer)
  }, [active, count, rotating])

  const goTo = (index: number) => {
    setPlaying(false)
    const element = viewport.current
    element?.scrollTo({
      left: ((index + count) % count) * element.clientWidth,
      behavior: reducedMotion ? 'instant' : 'smooth',
    })
  }

  if (!count) return <div className={styles.emptyWork}>暂无已发布作品。</div>

  return (
    <div role="region" aria-label="最新作品" aria-roledescription="轮播"
      onPointerEnter={(event) => { if (event.pointerType === 'mouse') setHovered(true) }}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={(event) => { if (!rotationButton.current?.contains(event.target)) setPlaying(false) }}>
      <div className={styles.carouselStage}>
        <div ref={viewport} id={viewportId} className={styles.carouselViewport}
          tabIndex={count > 1 ? 0 : undefined} aria-label="左右切换作品"
          onPointerDown={() => setPlaying(false)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault()
              event.currentTarget.focus({ preventScroll: true })
              goTo(active + (event.key === 'ArrowRight' ? 1 : -1))
            }
          }}>
          {products.map((product, index) => (
            <article key={product.id} className={styles.productCard} aria-roledescription="幻灯片"
              aria-label={`${index + 1} / ${count}：${product.name}`} inert={index !== active}>
              <Link href={`/products/${product.slug}`} className={styles.productVisual}
                aria-label={`查看 ${product.name} 作品详情`}>
                {product.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.coverUrl} alt={`${product.name} 作品概念封面`} width={1400} height={560}
                    loading={index === 0 ? 'eager' : 'lazy'} fetchPriority={index === 0 ? 'high' : 'auto'} />
                ) : <span className={styles.coverFallback}>{product.name}</span>}
              </Link>
              <div className={styles.productInfo}>
                <div className={styles.productIdentity}>
                  {product.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.logoUrl} alt="" width={36} height={36} className={styles.productLogo} />
                  )}
                  <div className={styles.productHeading}>
                    <h3><Link href={`/products/${product.slug}`}>{product.name}</Link></h3>
                    {(product.platform || product.statusLabel) && (
                      <div className={styles.productMeta}>
                        {product.platform && <span>{product.platform}</span>}
                        {product.platform && product.statusLabel && <span aria-hidden="true">·</span>}
                        {product.statusLabel && <span>{product.statusLabel}</span>}
                      </div>
                    )}
                  </div>
                </div>
                {(product.summary || product.tagline) && (
                  <p className={styles.summary}>{product.summary || product.tagline}</p>
                )}
                {product.highlights.length > 0 && (
                  <ul className={styles.highlights}>
                    {product.highlights.slice(0, 3).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                )}
                <Link href={`/products/${product.slug}`} className={styles.primaryLink}>
                  查看详情
                </Link>
              </div>
            </article>
          ))}
        </div>
        {count > 1 && (
          <div className={styles.coverNavigation} role="group" aria-label="作品主图切换">
            <Button type="text" shape="circle" className={styles.coverButton} aria-label="上一件作品"
              aria-controls={viewportId} onClick={() => goTo(active - 1)}>
              <LeftOutlined aria-hidden />
            </Button>
            <Button type="text" shape="circle" className={styles.coverButton} aria-label="下一件作品"
              aria-controls={viewportId} onClick={() => goTo(active + 1)}>
              <RightOutlined aria-hidden />
            </Button>
          </div>
        )}
      </div>
      {count > 1 && (
        <div className={styles.carouselControls}>
          <div className={styles.carouselDots} role="group" aria-label="选择作品">
            {products.map((product, index) => (
              <Button key={product.id} type="text" className={styles.carouselDot}
                aria-label={`展示 ${product.name}`} aria-current={index === active ? 'true' : undefined}
                aria-controls={viewportId} onClick={() => goTo(index)}><span /></Button>
            ))}
          </div>
          <div className={styles.carouselNavigation}>
            <span className={styles.carouselCount} aria-live={rotating ? 'off' : 'polite'} aria-atomic="true">
              <span className="sr-only">{products[active]?.name}，</span>{active + 1} / {count}
            </span>
            {!reducedMotion && (
              <Button ref={rotationButton} type="text" shape="circle" className={styles.carouselButton} aria-label={playing ? '暂停自动轮播' : '开始自动轮播'}
                onClick={() => setPlaying(!playing)}>
                {playing ? <PauseOutlined aria-hidden /> : <CaretRightOutlined aria-hidden />}
              </Button>
            )}
            <Button type="text" shape="circle" className={styles.carouselButton} aria-label="上一件作品"
              aria-controls={viewportId} onClick={() => goTo(active - 1)}><LeftOutlined aria-hidden /></Button>
            <Button type="text" shape="circle" className={styles.carouselButton} aria-label="下一件作品"
              aria-controls={viewportId} onClick={() => goTo(active + 1)}><RightOutlined aria-hidden /></Button>
          </div>
        </div>
      )}
    </div>
  )
}
