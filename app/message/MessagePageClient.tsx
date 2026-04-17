'use client'

import { Button, App } from 'antd'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import CommentInput from '@/components/CommentInput'
import CommentTree from '@/components/CommentTree'
import Pagination from '@/components/Pagination'
import {
  addMessageAction,
  setMessageShowAction,
} from '@/app/actions/messages'
import { useUser, useShowLogin } from '@/lib/store'
import type { Message, Paginated } from '@/lib/types'

export default function MessagePageClient({ initial }: { initial: Paginated<Message> }) {
  const [data, setData] = useState(initial)
  // When the server re-renders after a submit (`router.push` to a new
  // page, or `router.refresh()` on the current one), a fresh `initial`
  // prop arrives but `useState(initial)` keeps the stale first-render
  // value. Sync the local copy so the new list shows up.
  useEffect(() => {
    setData(initial)
  }, [initial])
  const [msg, setMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const user = useUser()
  const showLogin = useShowLogin()
  const { message } = App.useApp()
  const router = useRouter()
  const sp = useSearchParams()

  const submit = async (body: string, responseId?: number, onDone?: () => void) => {
    if (!body.trim()) {
      message.info('留言不能为空')
      return
    }
    if (!user?.id) {
      showLogin()
      return
    }
    setSubmitting(true)
    const r = await addMessageAction({ body, responseId })
    setSubmitting(false)
    if (r.ok) {
      if (responseId) {
        setData({ ...data, list: [...data.list, r.data] })
      } else {
        setMsg('')
        const currentPage = sp?.get('page')
        if (!currentPage) router.push('/message?page=1')
        else router.refresh()
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
    } else {
      message.error(r.error || '操作失败')
    }
  }

  return (
    <div>
      <div className="overflow-hidden pb-3">
        <CommentInput
          value={msg}
          onChange={setMsg}
          placeholder="有什么想对我说的，在这里给我留言吧"
        />
        <Button
          className="btn-success float-right mt-2"
          loading={submitting}
          onClick={() => submit(msg)}
        >
          留言
        </Button>
      </div>
      <div className="clear-both pt-5">
        <CommentTree
          list={data.list}
          onReply={submit}
          onSetVisibility={toggleVisibility}
        />
      </div>
      <Pagination
        total={data.total}
        perPage={data.perPage}
        page={data.page}
        hrefFor={(p) => `/message?page=${p}`}
      />
    </div>
  )
}
