'use client'

import { Button, App, Input } from 'antd'
import { useEffect, useRef, useState } from 'react'
import type { Comment } from '@/lib/types'
import { useUser, useShowLogin } from '@/lib/store'
import { useUserById } from '@/lib/user-cache'
import UserAvatar from './UserAvatar'
import { timeShow } from '@/lib/utils'

type ReplyHandler = (
  body: string,
  responseId: number | undefined,
  onDone?: () => void,
) => void

type SetVisibilityHandler = (comment: Comment, done: () => void) => void

interface Props {
  list: Comment[]
  currentId?: number | string
  onReply: ReplyHandler
  onSetVisibility?: SetVisibilityHandler
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
}: {
  comment: Comment
  isChild: boolean
  rootId?: number
  responseUserId?: number
  isCurrent: boolean
  onReply: ReplyHandler
  onSetVisibility?: SetVisibilityHandler
}) {
  const user = useUser()
  const showLogin = useShowLogin()
  const { message } = App.useApp()
  const [editing, setEditing] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [hidden, setHidden] = useState(!!comment.hide)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const replyTargetUser = useUserById(
    isChild && rootId && comment.responseId !== rootId ? responseUserId : null,
  )

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const avatarSize = isChild ? 28 : 36

  const submitReply = () => {
    if (!reply.trim()) {
      message.info('内容不能为空')
      return
    }
    if (!user?.id) {
      showLogin()
      return
    }
    setSending(true)
    onReply(reply, comment.id, () => {
      setSending(false)
      setEditing(false)
      setReply('')
    })
  }

  const passVisibility = () => {
    if (!onSetVisibility) return
    onSetVisibility(comment, () => setHidden(false))
  }

  return (
    <div
      className={`break-words ${isChild ? 'pl-10' : 'pt-2'} ${
        isCurrent ? 'bg-[#ECF5FD]' : ''
      }`}
    >
      <div className="flex flex-wrap items-center text-sm font-bold">
        <UserAvatar userId={comment.authorId} size={avatarSize} />
        {isChild && rootId && comment.responseId !== rootId && responseUserId ? (
          <span className="ml-1 text-[#aaa]">
            回复
            <span className="px-1 text-[#4791ff]">
              {replyTargetUser?.username || ''}
            </span>
          </span>
        ) : null}
      </div>
      <div className={isChild ? 'pl-[30px]' : 'pl-10'}>
        <div className="whitespace-pre-wrap py-1 text-[15px] text-[#333]">
          {comment.body}
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
        <div className="flex items-center text-sm leading-8 text-[#aaa]">
          <span
            onClick={() => setEditing((v) => !v)}
            className={`cursor-pointer select-none hover:font-bold hover:text-[#6B798C] ${
              editing ? 'font-bold text-[#6B798C]' : ''
            }`}
          >
            回复
          </span>
          <span className="mx-1 inline-block h-1 w-1 rounded-full border-2 border-[#ccc]" />
          <span>{timeShow(comment.timestamp)}</span>
        </div>
        {editing && (
          <div className="mt-1">
            <Input.TextArea
              ref={inputRef}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="回复..."
              autoSize={{ minRows: 2, maxRows: 6 }}
            />
            <div className="mt-2 space-x-2">
              <Button size="small" type="primary" loading={sending} onClick={submitReply}>
                确定
              </Button>
              <Button size="small" onClick={() => setEditing(false)}>
                取消
              </Button>
            </div>
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
}: Props) {
  const tree = buildTree(list || [])
  if (!tree.length) {
    return <div className="py-6 text-center text-[#999]">暂无评论</div>
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
