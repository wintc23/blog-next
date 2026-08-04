'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { trackEvent } from '@/lib/stat-event'

export default function PageViewTracker() {
  const pathname = usePathname()
  const sp = useSearchParams()
  const previousPath = useRef('')

  useEffect(() => {
    const qs = sp?.toString() ?? ''
    const fullPath = qs ? `${pathname}?${qs}` : (pathname ?? '')
    if (!fullPath || fullPath.startsWith('/manage')) return
    const from = previousPath.current
      ? `${window.location.origin}${previousPath.current}`
      : document.referrer
    trackEvent('visitPage', {
      fullPath,
      from,
    })
    previousPath.current = fullPath
  }, [pathname, sp])

  return null
}
