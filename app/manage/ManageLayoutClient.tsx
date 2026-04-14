'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu } from 'antd'
import {
  BookOutlined,
  TagsOutlined,
  CommentOutlined,
  MessageOutlined,
  BarChartOutlined,
} from '@ant-design/icons'
import { useEffect } from 'react'
import { Button } from 'antd'
import { useUser, useShowLogin } from '@/lib/store'

/**
 * Wrapper for the full-screen article editor route. Lock the page to
 * `overflow: hidden` while mounted: BlockNote portals its formatting
 * toolbars into a `bn-root` div appended to <body>, and when the
 * toolbar repositions (e.g. flipping below a tall image during scroll)
 * its absolute coordinates can extend past the viewport bottom, which
 * normally pops the browser-native scrollbar onto <html> *in addition*
 * to our editor's own `.scroll-thin` scroller — the "double scrollbar"
 * the user sees. Hiding overflow on html+body suppresses that second
 * scrollbar without affecting how floating-ui places the toolbar
 * relative to its reference image.
 */
function ArticleEditorShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.overflow
    const prevBody = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prevHtml
      body.style.overflow = prevBody
    }
  }, [])
  return <div className="flex h-screen flex-col bg-white">{children}</div>
}

const MENU = [
  { key: '/manage', label: '文章管理', icon: <BookOutlined /> },
  { key: '/manage/topic', label: '标签/分类', icon: <TagsOutlined /> },
  { key: '/manage/comment', label: '评论管理', icon: <CommentOutlined /> },
  { key: '/manage/message', label: '留言管理', icon: <MessageOutlined /> },
  { key: '/manage/stat', label: '访问统计', icon: <BarChartOutlined /> },
]

export default function ManageLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const user = useUser()
  const showLogin = useShowLogin()

  useEffect(() => {
    if (user && !user.admin) router.replace('/')
  }, [user, router])

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f4f4f4]">
        <div className="text-xl text-[#666]">需要登录后才能访问管理后台</div>
        <div className="flex gap-2">
          <Button type="primary" onClick={showLogin}>
            登录
          </Button>
          <Button onClick={() => router.push('/')}>返回首页</Button>
        </div>
      </div>
    )
  }
  if (!user.admin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f4f4f4]">
        <div className="text-xl text-[#666]">您没有管理权限</div>
        <Button type="primary" onClick={() => router.push('/')}>
          返回首页
        </Button>
      </div>
    )
  }

  // The article editor owns its own full-screen chrome (back button +
  // contextual action bar), so skip the management header on that route.
  if (pathname === '/manage/article' || pathname.startsWith('/manage/article/')) {
    return <ArticleEditorShell>{children}</ArticleEditorShell>
  }

  const selectedKey =
    MENU.map((m) => m.key)
      .sort((a, b) => b.length - a.length)
      .find((k) => pathname === k || pathname.startsWith(k + '/')) || '/manage'

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="relative z-[1] flex items-center bg-white shadow">
        <Link
          href="/"
          className="ml-4 rounded bg-[#409eff] px-3 py-1 text-sm font-bold text-white"
        >
          Home
        </Link>
        <div className="ml-auto">
          <Menu
            mode="horizontal"
            selectedKeys={[selectedKey]}
            items={MENU.map((m) => ({
              key: m.key,
              icon: m.icon,
              label: <Link href={m.key}>{m.label}</Link>,
            }))}
            style={{ borderBottom: 'none', minWidth: 600 }}
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-white">{children}</div>
    </div>
  )
}
