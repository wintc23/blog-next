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

  return (
    <div className="relative z-10">
      <div className="relative z-10 h-12" />
      <div className="absolute left-8 top-0 z-[1] h-16 w-16 rounded-full border border-[#57a3f3] bg-white" />
      <div
        onClick={() => (user?.id ? showUserDrawer(user.id) : showLogin())}
        className="absolute left-10 top-2 z-[3] flex h-12 w-12 cursor-pointer select-none items-center justify-center overflow-hidden rounded-full border border-[#57a3f3] bg-white"
      >
        {user?.id ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar} alt="avatar" className="h-full w-full object-cover" />
        ) : (
          <span>登录</span>
        )}
      </div>
      <Input.TextArea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoSize={{ minRows: rows, maxRows: 10 }}
        style={{ paddingTop: '1.5rem', borderColor: '#57a3f3' }}
      />
    </div>
  )
}
