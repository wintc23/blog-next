'use client'

import Link from 'next/link'
import { SITE } from '@/lib/config'
import { useUser, useSetHeaderOffset } from '@/lib/store'
import SiteSearch from './SiteSearch'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function Header() {
  const user = useUser()
  const pathname = usePathname()
  const setHeaderOffset = useSetHeaderOffset()
  const [state, setState] = useState<'' | 'hide' | 'show'>('')
  const oldScroll = useRef(0)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const onScroll = () => {
      window.requestAnimationFrame(() => {
        const el = document.scrollingElement || document.documentElement
        const h = ref.current?.getBoundingClientRect().height || 0
        const delta = el.scrollTop - oldScroll.current
        oldScroll.current = el.scrollTop
        // Matches blog-ssr: natural top → '', scroll down → hide, scroll up → show.
        // headerOffset mirrors the old site's `headerHeight` var used to drive
        // the sticky outline module's `top` — 0 when header is at natural
        // position OR hidden, = header height when re-shown via scroll-up.
        if (el.scrollTop <= h) {
          setState('')
          setHeaderOffset(0)
        } else if (delta > 0) {
          setState('hide')
          setHeaderOffset(0)
        } else {
          setState('show')
          setHeaderOffset(h)
        }
      })
    }
    document.addEventListener('scroll', onScroll, { passive: true })
    return () => document.removeEventListener('scroll', onScroll)
  }, [setHeaderOffset])

  const navList = [
    { title: '首页', path: '/', active: pathname === '/' },
    {
      title: '博客',
      path: '/article',
      active:
        pathname === '/article' ||
        pathname?.startsWith('/article/') ||
        pathname?.startsWith('/tag/'),
    },
    {
      title: '作品',
      path: '/products',
      active: pathname === '/products' || pathname?.startsWith('/products/'),
    },
    {
      title: '留言',
      path: '/message',
      active: pathname === '/message' || pathname?.startsWith('/message/'),
    },
  ]
  if (user?.admin) {
    navList.push({
      title: '后台管理',
      path: '/manage',
      active: pathname === '/manage' || pathname?.startsWith('/manage/'),
    })
  }

  return (
    <header ref={ref} className={`layout-header ${state}`}>
      <div className="layout-header-main">
        <div className="site-title">
          <Link href="/" className="title-content">
            {SITE.title}
          </Link>
        </div>
        <nav className="nav-list" aria-label="主导航">
          {navList.map((nav) => (
            <Link
              key={nav.path}
              href={nav.path}
              className={`nav ${nav.active ? 'active' : ''}`}
              aria-current={nav.active ? 'page' : undefined}
            >
              {nav.title}
            </Link>
          ))}
        </nav>
        <SiteSearch />
      </div>
    </header>
  )
}
