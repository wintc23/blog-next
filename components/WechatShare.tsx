'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { SITE } from '@/lib/config'

export type WechatShareData = { title: string; desc: string; link: string; imgUrl: string }
type ShareData = WechatShareData
export const WECHAT_SHARE_EVENT = 'site:wechat-share'
type Wechat = {
  config: (options: Record<string, unknown>) => void
  ready: (callback: () => void) => void
  error: (callback: () => void) => void
  updateAppMessageShareData: (data: ShareData) => void
  updateTimelineShareData: (data: Omit<ShareData, 'desc'>) => void
}
declare global { interface Window { wx?: Wechat } }
let sdk: Promise<Wechat> | undefined
let entryUrl: string | undefined

function loadSdk() {
  if (window.wx) return Promise.resolve(window.wx)
  sdk ||= new Promise<Wechat>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js'
    script.async = true
    script.onload = () => window.wx ? resolve(window.wx) : reject(new Error('Missing WeChat SDK'))
    script.onerror = () => { script.remove(); reject(new Error('WeChat SDK unavailable')) }
    document.head.appendChild(script)
  }).catch(error => { sdk = undefined; throw error })
  return sdk
}

function pageShareData(): ShareData {
  const meta = (name: string) => document.querySelector<HTMLMetaElement>(`meta[property="${name}"]`)?.content
  return {
    title: meta('og:title') || document.title,
    desc: meta('og:description') || document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content || '',
    link: meta('og:url') || location.href.split('#')[0],
    imgUrl: new URL(meta('og:image') || SITE.icon, SITE.url).href,
  }
}

/** Configure WeChat's own share menu; regular browsers do not load the SDK. */
export default function WechatShare() {
  const pathname = usePathname()
  const [override, setOverride] = useState<ShareData | null>(null)
  useEffect(() => {
    const change = (event: Event) => setOverride((event as CustomEvent<ShareData | null>).detail)
    window.addEventListener(WECHAT_SHARE_EVENT, change)
    return () => window.removeEventListener(WECHAT_SHARE_EVENT, change)
  }, [])
  useEffect(() => {
    if (!/MicroMessenger/i.test(navigator.userAgent) || location.origin !== new URL(SITE.url).origin) return
    entryUrl ||= location.href.split('#')[0]
    if (!override && /^\/(manage|login|qqtoken|ai\/chat|tools\/tasks)(\/|$)/.test(pathname)) return
    const controller = new AbortController()
    let observer: MutationObserver | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    let ready = false
    async function configure() {
      // iOS WeChat retains the entry URL when Next.js navigates without reloading.
      const url = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? entryUrl! : location.href.split('#')[0]
      const response = await fetch(`/wechat/share-config?${new URLSearchParams({ url })}`, { signal: controller.signal })
      if (!response.ok) return
      const { enabled, ...config } = await response.json()
      if (!enabled || controller.signal.aborted) return
      const wx = await loadSdk()
      if (controller.signal.aborted) return
      const update = () => {
        if (!ready || controller.signal.aborted) return
        const data = override || pageShareData()
        wx.updateAppMessageShareData(data)
        wx.updateTimelineShareData({ title: data.title, link: data.link, imgUrl: data.imgUrl })
      }
      wx.ready(() => { ready = true; update() })
      wx.error(() => { ready = false })
      observer = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(update, 100) })
      observer.observe(document.head, { subtree: true, childList: true, attributes: true, characterData: true })
      wx.config({ debug: false, ...config, jsApiList: ['updateAppMessageShareData', 'updateTimelineShareData'] })
    }
    void configure().catch(() => { /* Optional sharing must never block the page. */ })
    return () => { controller.abort(); observer?.disconnect(); clearTimeout(timer) }
  }, [pathname, override])
  return null
}
