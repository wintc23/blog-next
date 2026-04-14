'use client'

import { UserOutlined } from '@ant-design/icons'
import { useUserById } from '@/lib/user-cache'
import { useShowUserDrawer } from '@/lib/store'

interface Props {
  userId: number
  size?: number
  showName?: boolean
  nameClassName?: string
  className?: string
}

export default function UserAvatar({
  userId,
  size = 36,
  showName = true,
  nameClassName = 'text-[#4791ff] px-1',
  className = '',
}: Props) {
  const user = useUserById(userId)
  const showUserDrawer = useShowUserDrawer()

  return (
    <span
      className={`inline-flex items-center align-middle ${className}`}
      onClick={(e) => {
        e.stopPropagation()
        if (user?.id) showUserDrawer(user.id)
      }}
    >
      {user?.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatar}
          alt={user.username || ''}
          className="shrink-0 cursor-pointer rounded-full"
          style={{ width: size, height: size }}
        />
      ) : (
        <span
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#e8e8e8] text-[#999]"
          style={{ width: size, height: size, fontSize: size * 0.55 }}
        >
          <UserOutlined />
        </span>
      )}
      {showName && user?.username && (
        <span className={`cursor-pointer font-bold ${nameClassName}`}>
          {user.username}
        </span>
      )}
    </span>
  )
}
