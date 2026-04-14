'use client'

import Link from 'next/link'
import { SITE } from '@/lib/config'
import { useUser, useSetHeaderOffset } from '@/lib/store'
import SiteSearch from './SiteSearch'
import { useEffect, useRef, useState } from 'react'

export default function Header() {
  const user = useUser()
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
    { title: '首页', path: '/' },
    { title: '留言', path: '/message' },
    { title: '关于', path: '/about' },
  ]
  if (user?.admin) navList.push({ title: '后台管理', path: '/manage' })

  return (
    <header ref={ref} className={`layout-header ${state}`}>
      <div className="layout-header-main">
        <h1 className="site-title">
          <Link href="/" className="title-content">
            {SITE.title}
          </Link>
        </h1>
        <nav className="nav-list">
          {navList.map((nav) => (
            <Link key={nav.path} href={nav.path} className="nav">
              {nav.title}
            </Link>
          ))}
        </nav>
        <SiteSearch />
      </div>
    </header>
  )
}
