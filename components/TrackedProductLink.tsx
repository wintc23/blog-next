'use client'

import type { CSSProperties, ReactNode } from 'react'
import { trackEvent } from '@/lib/stat-event'

export default function TrackedProductLink({
  productId,
  productName,
  linkKey,
  label,
  href,
  location,
  className,
  style,
  children,
}: {
  productId: number
  productName: string
  linkKey: string
  label: string
  href: string
  location: string
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={className}
      style={style}
      onClick={() => trackEvent('product.link_click', {
        productId,
        productName,
        linkKey,
        linkLabel: label,
        location,
      })}
    >
      {children}
    </a>
  )
}
