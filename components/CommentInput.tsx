'use client'

import { Input } from 'antd'
import { useUser, useShowLogin, useShowUserDrawer } from '@/lib/store'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}

export default function CommentInput({ value, onChange, placeholder, rows = 4 }: Props) {
  const user = useUser()
  const showLogin = useShowLogin()
  const showUserDrawer = useShowUserDrawer()

  // The avatar bubble sits absolutely-positioned on top of the textarea.
  // On mobile WebViews (particularly WeChat's) tapping a `<div onClick>`
  // overlay above a native <textarea> can lose the click — touch events
  // bubble to the textarea instead and focus it, so the login modal
  // never opens. Using a real `<button>` element with explicit
  // stopPropagation gives the tap a proper event target. Then, when the
  // user is logged out, we also hijack the textarea click so any tap on
  // the input area (avatar OR text field) opens the login modal — the
  // user never has to hit a precise 48×48 target to authenticate.
  const handleAvatar = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    if (user?.id) showUserDrawer(user.id)
    else showLogin()
  }
  const guardTextarea = user?.id
    ? undefined
    : (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        showLogin()
      }

  return (
    // Outer wrapper is `relative` only — no explicit z-index. The fixed
    // page header sits at z-index: 2; if we put the input wrapper at
    // z-10 it would float over the header during scroll.
    <div className="relative" onClickCapture={guardTextarea}>
      {/* Placeholder reserves the top 48px so the textarea sits below the
          floating button. `pointer-events-none` so it can't intercept
          taps that should reach the avatar button on top of it. */}
      <div className="pointer-events-none relative z-[1] h-12" />
      {/* Single 64x64 button covers the entire visible circle — the
          previous layout split visuals across an outer decorative ring
          and a smaller inner button, leaving the outer ring (and the
          top half of the inner button, which the placeholder div was
          covering) unclickable. */}
      <button
        type="button"
        onClick={handleAvatar}
        aria-label={user?.id ? '查看我的信息' : '登录'}
        className="absolute left-8 top-0 z-[3] flex h-16 w-16 cursor-pointer select-none items-center justify-center overflow-hidden rounded-full border border-[#57a3f3] bg-white p-0"
      >
        {user?.id ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar} alt="avatar" className="h-full w-full object-cover" />
        ) : (
          <span>登录</span>
        )}
      </button>
      <Input.TextArea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoSize={{ minRows: rows, maxRows: 10 }}
        style={{ paddingTop: '1.5rem', borderColor: '#57a3f3' }}
        readOnly={!user?.id}
      />
    </div>
  )
}
