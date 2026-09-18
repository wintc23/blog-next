'use client'

import { Button, App } from 'antd'
import { useEffect, useState } from 'react'
import type { Comment } from '@/lib/types'
import { useUser, useShowLogin } from '@/lib/store'
import { useUserById } from '@/lib/user-cache'
import UserAvatar from './UserAvatar'
import { timeShow } from '@/lib/utils'
import CommentInput from './CommentInput'
import RichCommentBody from './RichCommentBody'
import { apiFetch } from '@/lib/api/client'
import { CommentSchema } from '@/lib/schemas/comment'

type ReplyHandler = (
  body: string,
  responseId: number | undefined,
  onDone?: () => void,
) => void | Promise<void>

type SetVisibilityHandler = (comment: Comment, done: () => void) => void

interface Props {
  list: Comment[]
  currentId?: number | string
  onReply: ReplyHandler
  onSetVisibility?: SetVisibilityHandler
  kind?: 'comment' | 'message'
}

type RootComment = Comment & { children: Comment[] }

/**
 * Flatten replies into two levels: root + direct children.
 * Replies that target nested comments still land in the root's children array,
 * mirroring the original blog-ssr logic.
 */
function buildTree(list: Comment[]): RootComment[] {
  const sorted = [...list].sort((a, b) => a.timestamp - b.timestamp)
  const childrenRef = new Map<number, Comment[]>()
  const roots: RootComment[] = []

  for (const c of sorted) {
    if (c.responseId) {
      const arr = childrenRef.get(c.responseId)
      if (!arr) continue
      arr.push(c)
      childrenRef.set(c.id, arr)
    } else {
      const children: Comment[] = []
      const root: RootComment = { ...c, children }
      childrenRef.set(c.id, children)
      roots.push(root)
    }
  }
  return roots.reverse()
}

function CommentItem({
  comment,
  isChild,
  rootId,
  responseUserId,
  isCurrent,
  onReply,
  onSetVisibility,
  kind,
}: {
  comment: Comment
  isChild: boolean
  rootId?: number
  responseUserId?: number
  isCurrent: boolean
  onReply: ReplyHandler
  onSetVisibility?: SetVisibilityHandler
  kind: 'comment' | 'message'
}) {
  const user = useUser()
  const showLogin = useShowLogin()
  const { message } = App.useApp()
  const [editing, setEditing] = useState(false)
  const [editingOwn, setEditingOwn] = useState(false)
  const [body, setBody] = useState(comment.body)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [hidden, setHidden] = useState(!!comment.hide)
  const [uploading, setUploading] = useState(false)
  const replyTargetUser = useUserById(
    isChild && rootId && comment.responseId !== rootId ? responseUserId : null,
  )

  useEffect(() => {
    setBody(comment.body)
    setHidden(!!comment.hide)
  }, [comment.body, comment.hide])

  const avatarSize = isChild ? 28 : 36

  const submitReply = async () => {
    if (sending || uploading) return
    if (!reply.trim()) {
      message.info('内容不能为空')
      return
    }
    if (!user?.id) {
      showLogin()
      return
    }
    setSending(true)
    try {
      if (editingOwn) {
        const updated = await apiFetch(`/${kind}s/${comment.id}/`, { method: 'PUT', data: { body: reply }, schema: CommentSchema })
        setBody(updated.body)
        setHidden(!!updated.hide)
        setEditing(false)
        setReply('')
        message.success(updated.hide ? '已保存，审核后公开' : '已保存')
      } else await onReply(reply, comment.id, () => {
        setEditing(false)
        setReply('')
      })
    } catch (error) {
      message.error(error instanceof Error ? error.message : '提交失败，请重试')
    } finally {
      setSending(false)
    }
  }

  const passVisibility = () => {
    if (!onSetVisibility) return
    onSetVisibility(comment, () => setHidden(false))
  }

  return (
    <div
      className={`break-words ${isChild ? 'pl-10' : 'pt-2'} ${
        isCurrent ? 'bg-[var(--site-primary-soft)]' : ''
      }`}
    >
      <div className="flex flex-wrap items-center text-sm font-bold">
        <UserAvatar userId={comment.authorId} size={avatarSize} />
        {isChild && rootId && comment.responseId !== rootId && responseUserId ? (
          <span className="ml-1 text-[var(--site-text-disabled)]">
            回复
            <span className="px-1 text-[var(--site-primary)]">
              {replyTargetUser?.username || ''}
            </span>
          </span>
        ) : null}
      </div>
      <div className={isChild ? 'pl-[30px]' : 'pl-10'}>
        <div className="whitespace-pre-wrap py-1 text-base text-[var(--site-text)]">
          <RichCommentBody body={body} />
          {hidden && (
            <span className="ml-2 text-xs">
              <span className="text-[#FF4949]">[待审核,审核后公开]</span>
              {user?.admin && onSetVisibility && (
                <Button
                  type="dashed"
                  size="small"
                  className="ml-1"
                  onClick={passVisibility}
                >
                  通过
                </Button>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center text-sm leading-8 text-[var(--site-text-disabled)]">
          <button
            type="button"
            onClick={() => { setEditingOwn(false); setReply(''); setEditing((v) => !v) }}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className={`border-0 bg-transparent p-0 text-inherit cursor-pointer select-none hover:font-bold hover:text-[var(--site-text-secondary)] ${
              editing ? 'font-bold text-[var(--site-text-secondary)]' : ''
            }`}
          >
            回复
          </button>
          {(user?.id === comment.authorId || user?.admin) && <button type="button" className="ml-3 border-0 bg-transparent p-0 text-inherit hover:text-[var(--site-primary)]" onClick={() => { setEditingOwn(true); setReply(body); setEditing(true) }}>编辑</button>}
          <span className="mx-1 inline-block h-1 w-1 rounded-full border-2 border-[var(--site-border)]" />
          <span>{timeShow(comment.timestamp)}</span>
        </div>
        {editing && (
          <div className="mt-1">
            <CommentInput
              value={reply}
              onChange={setReply}
              placeholder={editingOwn ? '编辑内容' : '回复...'}
              compact
              rows={2}
              onBusyChange={setUploading}
              actions={(
                <>
                  <Button size="small" type="primary" loading={sending} disabled={uploading} onClick={submitReply}>
                    {editingOwn ? '保存' : '回复'}
                  </Button>
                  <Button size="small" disabled={sending || uploading} onClick={() => setEditing(false)}>
                    取消
                  </Button>
                </>
              )}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default function CommentTree({
  list,
  currentId,
  onReply,
  onSetVisibility,
  kind = 'comment',
}: Props) {
  const tree = buildTree(list || [])
  if (!tree.length) {
    return <div className="py-6 text-center text-[var(--site-text-disabled)]">暂无评论</div>
  }

  // Build id -> comment map for resolving reply targets
  const byId = new Map<number, Comment>()
  for (const c of list) byId.set(c.id, c)

  return (
    <div className="comment-list">
      {tree.map((root) => {
        const isRootCurrent =
          currentId !== undefined && String(currentId) === String(root.id)
        return (
          <div
            key={root.id}
            className="ws mb-3 rounded-sm p-3"
          >
            <CommentItem
              kind={kind}
              comment={root}
              isChild={false}
              rootId={root.id}
              isCurrent={isRootCurrent}
              onReply={onReply}
              onSetVisibility={onSetVisibility}
            />
            {root.children.length > 0 && (
              <div className="mt-4 space-y-4">
                {root.children.map((child) => {
                  const parent =
                    child.responseId && child.responseId !== root.id
                      ? byId.get(child.responseId)
                      : undefined
                  const isChildCurrent =
                    currentId !== undefined &&
                    String(currentId) === String(child.id)
                  return (
                    <CommentItem
                      kind={kind}
                      key={child.id}
                      comment={child}
                      isChild
                      rootId={root.id}
                      responseUserId={parent?.authorId}
                      isCurrent={isChildCurrent}
                      onReply={onReply}
                      onSetVisibility={onSetVisibility}
                    />
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
