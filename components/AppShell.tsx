'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import Header from './layout/Header'
import Sidebar from './layout/Sidebar'
import Footer from './layout/Footer'
import homeStyles from './home/Home.module.css'
import newsStyles from './ai-digest/PublicNews.module.css'

/** Routes that opt out of the global header/sidebar/footer. */
const BARE_ROUTES = ['/login', '/qqtoken']
/** Routes that render fully standalone (own layout, no padding). */
const STANDALONE_ROUTES = ['/manage', '/ai']
/** Routes without the sidebar still share the site's content width. */
const HIDE_SIDEBAR_PREFIXES = [
  '/tools',
  '/message',
  '/about',
  '/products',
  '/moments',
  '/recommendation',
]

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
  const isHome = pathname === '/'
  const isNews = pathname === '/ai-news' || pathname?.startsWith('/ai-news/')
  const isTool = pathname === '/tools' || pathname?.startsWith('/tools/')

  return (
    <div className={`layout ${isHome || isTool ? homeStyles.shell : ''} ${isNews ? newsStyles.shell : ''}`}>
      <Header />
      <main className={`layout-main ${hideModules ? 'hide-modules' : ''} ${isHome || isTool ? homeStyles.layout : ''} ${isNews ? newsStyles.layout : ''}`}>
        {!isHome && !isNews && !isTool && <Sidebar />}
        <div className="nuxt-container">{children}</div>
      </main>
      <Footer />
    </div>
  )
}
