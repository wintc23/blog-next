'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import Header from './layout/Header'
import dynamic from 'next/dynamic'
import { usesBlogSidebar } from '@/lib/site-layout'

const Sidebar = dynamic(() => import('./layout/Sidebar'))
import Footer from './layout/Footer'
import homeStyles from './home/Home.module.css'
import newsStyles from './ai-digest/PublicNews.module.css'

/** Routes that opt out of the global header/sidebar/footer. */
const BARE_ROUTES = ['/login', '/qqtoken']
/** Routes that render fully standalone (own layout, no padding). */
const STANDALONE_ROUTES = ['/manage', '/ai']

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

  const showSidebar = usesBlogSidebar(pathname)
  const isHome = pathname === '/'
  const isNews = pathname === '/ai-news' || pathname?.startsWith('/ai-news/')
  const isMoments = pathname === '/moments' || pathname?.startsWith('/moments/')
  const isTool = pathname === '/tools' || pathname?.startsWith('/tools/')

  return (
    <div className={`layout ${isHome || isTool || isMoments ? homeStyles.shell : ''} ${isNews ? newsStyles.shell : ''}`}>
      <Header />
      <main className={`layout-main ${isHome || isTool || isMoments ? homeStyles.layout : ''} ${isNews ? newsStyles.layout : ''}`}>
        {showSidebar && <Sidebar />}
        <div className="nuxt-container">{children}</div>
      </main>
      <Footer />
    </div>
  )
}
