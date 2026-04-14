'use client'

import { useEffect, useRef } from 'react'
import io from 'socket.io-client'
import { notification } from 'antd'
import { BASE_URL } from '@/lib/config'
import { useUser } from '@/lib/store'
import { camel, getTokenClient } from '@/lib/utils'

type Socket = ReturnType<typeof io>

const NOTIFY_COMMENT = 3
const NOTIFY_COMMENT_REPLY = 5
const NOTIFY_MESSAGE = 6
const NOTIFY_MESSAGE_REPLY = 7

const TITLE_MAP: Record<number, string> = {
  [NOTIFY_COMMENT]: '新增评论',
  [NOTIFY_COMMENT_REPLY]: '评论回复',
  [NOTIFY_MESSAGE]: '新增留言',
  [NOTIFY_MESSAGE_REPLY]: '留言回复',
}

interface NotifyPayload {
  type: number
  username: string
  postTitle?: string
  url?: string
  content?: string
}

export default function SocketClient() {
  const user = useUser()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const origin = BASE_URL.replace(/\/api\/?$/, '')
    const socket = io(origin, { transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('connect', () => {
      const token = getTokenClient()
      if (token) socket.emit('bind-user', { token })
    })

    socket.on('message', (payload: { type: string; data: unknown }) => {
      const data = camel(payload.data) as Record<string, unknown>
      if (payload.type === 'notify') {
        const p = data as unknown as NotifyPayload
        notification.info({
          message: TITLE_MAP[p.type] || '通知',
          description: (
            <div className="text-sm leading-relaxed">
              <span className="font-bold text-[#FFA710]">{p.username}</span>
              {p.type === NOTIFY_COMMENT && (
                <>
                  {' 评论了文章 '}
                  <span className="text-[#2d8cf0]">《{p.postTitle}》</span>
                </>
              )}
              {p.type === NOTIFY_COMMENT_REPLY && (
                <>
                  {' 在 '}
                  <span className="text-[#2d8cf0]">《{p.postTitle}》</span>
                  {' 回复了你'}
                </>
              )}
              {p.type === NOTIFY_MESSAGE && ' 在留言板留言'}
              {p.type === NOTIFY_MESSAGE_REPLY && ' 回复了你的留言'}
              {p.content && (
                <>
                  : <span className="font-bold text-black">{p.content}</span>
                </>
              )}
              {p.url && (
                <div className="mt-2">
                  <a href={p.url} className="underline">
                    点击查看
                  </a>
                </div>
              )}
            </div>
          ),
          duration: 0,
        })
      }
    })

    socket.on('connect_error', (err: Error) => {
      console.warn('socket error', err.message)
    })

    return () => {
      socket.close()
      socketRef.current = null
    }
  }, [user?.id])

  return null
}
