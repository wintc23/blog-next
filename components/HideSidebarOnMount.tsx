'use client'

import { useEffect } from 'react'

/**
 * Tiny client helper that toggles a class on <body> while mounted, so
 * pages like `app/not-found.tsx` (a Server Component) can still ask the
 * app shell to hide its sidebar modules via CSS without being converted
 * into a Client Component themselves.
 */
export default function HideSidebarOnMount({
  bodyClass,
}: {
  bodyClass: string
}) {
  useEffect(() => {
    document.body.classList.add(bodyClass)
    return () => {
      document.body.classList.remove(bodyClass)
    }
  }, [bodyClass])
  return null
}
