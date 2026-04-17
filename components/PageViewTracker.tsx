'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { trackEvent } from '@/lib/stat-event'

export default function PageViewTracker() {
  const pathname = usePathname()
  const sp = useSearchParams()

  useEffect(() => {
    const qs = sp?.toString() ?? ''
    const fullPath = qs ? `${pathname}?${qs}` : pathname
    trackEvent('visitPage', {
      fullPath,
      from: typeof document !== 'undefined' ? document.referrer : '',
    })
  }, [pathname, sp])

  return null
}
