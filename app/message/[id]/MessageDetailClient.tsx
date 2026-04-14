'use client'

import { useState } from 'react'
import { App } from 'antd'
import { useRouter } from 'next/navigation'
import CommentTree from '@/components/CommentTree'
import {
  addMessageAction,
  setMessageShowAction,
} from '@/app/actions/messages'
import { useUser, useShowLogin } from '@/lib/store'
import type { Message } from '@/lib/types'

export default function MessageDetailClient({
  initial,
  currentId,
}: {
  initial: Message[]
  currentId: string
}) {
  const [list, setList] = useState<Message[]>(initial)
  const user = useUser()
  const showLogin = useShowLogin()
  const { message } = App.useApp()
  const router = useRouter()

  const submit = async (body: string, responseId?: number, onDone?: () => void) => {
    if (!body.trim()) {
      message.info('内容不能为空')
      return
    }
    if (!user?.id) {
      showLogin()
      return
    }
    const r = await addMessageAction({ body, responseId })
    if (r.ok) {
      if (responseId) {
        setList((l) => [...l, r.data])
      } else {
        router.refresh()
      }
      onDone?.()
      message.success('留言成功')
    } else {
      message.error(r.error || '网络请求失败')
    }
  }

  const toggleVisibility = async (m: { id: number }, done: () => void) => {
    const r = await setMessageShowAction(m.id)
    if (r.ok) {
      done()
      router.refresh()
    }
  }

  return (
    <div className="mx-2">
      <CommentTree
        list={list}
        currentId={currentId}
        onReply={submit}
        onSetVisibility={toggleVisibility}
      />
    </div>
  )
}
