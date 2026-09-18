'use client'

import { App, Button, Spin } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { useUser, useShowLogin } from '@/lib/store'
import { apiFetch } from '@/lib/api/client'
import { CommentSchema } from '@/lib/schemas/comment'
import { setCommentShowAction } from '@/app/actions/comments'
import CommentInput from '../CommentInput'
import CommentTree from '../CommentTree'

const Comments = z.object({ comments: z.array(CommentSchema), commentTimes: z.number() })

export default function DigestComments({ digestId }: { digestId: number }) {
  const user = useUser()
  const showLogin = useShowLogin()
  const { message } = App.useApp()
  const [data, setData] = useState<z.infer<typeof Comments>>({ comments: [], commentTimes: 0 })
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const pending = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setData({ comments: [], commentTimes: 0 })
    setError('')
    apiFetch('/comments/', { params: { digest_id: digestId }, schema: Comments, signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setData(result) })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '评论加载失败') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [digestId, user?.id, reload])

  const submit = async (text: string, responseId?: number, done?: () => void) => {
    if (!user) { showLogin(); return }
    if (!text.trim()) { message.info('评论不能为空'); return }
    if (pending.current) return
    pending.current = true
    setSending(true)
    try {
      const result = await apiFetch('/add-comment/', { method: 'POST', data: { body: text, digestId, responseId }, schema: Comments })
      setData(result)
      if (!responseId) setBody('')
      done?.()
      message.success(user.admin ? '评论成功' : '评论已提交，审核后公开')
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : '评论失败，请重试')
    } finally {
      pending.current = false
      setSending(false)
    }
  }

  return (
    <section id="comments" className="mt-10 scroll-mt-40 border-t border-[var(--site-border)] pt-6 sm:scroll-mt-24" aria-labelledby="digest-comments-title">
      <h2 id="digest-comments-title" className="mb-4 text-xl font-semibold">评论{!loading && `（${data.commentTimes}）`}</h2>
      <CommentInput value={body} onChange={setBody} onBusyChange={setUploading} placeholder="聊聊你对本期 AI 快讯的看法" actions={<Button type="primary" loading={sending} disabled={uploading || loading} onClick={() => submit(body)}>发表评论</Button>} />
      <div className="h-6" />
      {loading ? <div className="py-5 text-center"><Spin aria-label="正在加载评论" /></div> : error ? <p role="alert">{error}<Button type="link" onClick={() => setReload((count) => count + 1)}>重新加载</Button></p> :
        <CommentTree list={data.comments} onReply={submit} onSetVisibility={async (comment, done) => {
          const result = await setCommentShowAction(comment.id)
          if (result.ok) done()
          else message.error(result.error || '操作失败')
        }} />}
    </section>
  )
}
