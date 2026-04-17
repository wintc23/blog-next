'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import Header from './layout/Header'
import Sidebar from './layout/Sidebar'
import Footer from './layout/Footer'

/** Routes that opt out of the global header/sidebar/footer. */
const BARE_ROUTES = ['/login', '/qqtoken']
/** Routes that render fully standalone (own layout, no padding). */
const STANDALONE_ROUTES = ['/manage']
/** Routes where the sidebar (and its 280px column) is hidden, so the
 * main content can use a narrower 960px max-width. Mirrors blog-ssr's
 * `hide-modules` class. */
const HIDE_SIDEBAR_PREFIXES = ['/message', '/about', '/recommendation']

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  if (
    STANDALONE_ROUTES.some((p) => pathname === p || pathname?.startsWith(p + '/'))
  ) {
    return <>{children}</>
  }

  if (BARE_ROUTES.some((p) => pathname === p || pathname?.startsWith(p + '/'))) {
    return <div className="min-h-screen p-6">{children}</div>
  }

  const hideModules = HIDE_SIDEBAR_PREFIXES.some(
    (p) => pathname === p || pathname?.startsWith(p + '/'),
  )

  return (
    <div className="layout">
      <Header />
      <main className={`layout-main ${hideModules ? 'hide-modules' : ''}`}>
        <Sidebar />
        <div className="nuxt-container">{children}</div>
      </main>
      <Footer />
    </div>
  )
}
