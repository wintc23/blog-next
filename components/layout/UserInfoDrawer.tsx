'use client'

import { Drawer, Button, Input, App } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import {
  useUser,
  useDrawerUserId,
  useHideUserDrawer,
  useLogout,
  useRefreshUser,
} from '@/lib/store'
import { getUserDetail } from '@/lib/api/users'
import { setEmailAction } from '@/app/actions/users'
import { timeShow } from '@/lib/utils'

interface UserDetail {
  id: number
  username: string
  avatar: string
  email?: string
  likes: { timestamp: number; postId: number; postTitle: string }[]
  messages: { timestamp: number; body?: string }[]
  comments: { timestamp: number; body?: string; postId: number; postTitle: string }[]
}

export default function UserInfoDrawer() {
  const drawerUserId = useDrawerUserId()
  const hideUserDrawer = useHideUserDrawer()
  const user = useUser()
  const refresh = useRefreshUser()
  const logout = useLogout()
  const { message } = App.useApp()
  const [detail, setDetail] = useState<UserDetail | null>(null)
  const [editingEmail, setEditingEmail] = useState(false)
  const [emailValue, setEmailValue] = useState('')

  const load = useCallback(async (id: number) => {
    try {
      const data = await getUserDetail(id)
      setDetail(data as unknown as UserDetail)
    } catch {
      setDetail(null)
    }
  }, [])

  useEffect(() => {
    if (!drawerUserId) {
      setEditingEmail(false)
      return
    }
    // Skip the fetch when the cached detail already matches — reopening the
    // same user is instant, matching blog-ssr's behavior.
    if (detail && detail.id === drawerUserId) return
    load(drawerUserId)
  }, [drawerUserId, detail, load])

  // Only mount the Drawer once detail for the requested user is ready, so
  // it slides in already populated (no empty → filled flash).
  if (!drawerUserId || !detail || detail.id !== drawerUserId) return null

  const activities = [
    ...(detail.likes || []).map((l) => ({ ...l, type: 1 as const })),
    ...(detail.messages || []).map((m) => ({
      ...m,
      type: 2 as const,
      postId: 0,
      postTitle: '',
    })),
    ...(detail.comments || []).map((c) => ({ ...c, type: 3 as const })),
  ].sort((a, b) => b.timestamp - a.timestamp)

  const canSeeEmail = user?.admin || user?.id === detail.id

  const saveEmail = async () => {
    const r = await setEmailAction({ userId: detail.id, email: emailValue })
    if (r.ok) {
      setEditingEmail(false)
      load(detail.id)
      refresh()
      message.success('保存成功')
    } else {
      message.error(r.error || '保存失败')
    }
  }

  return (
    <Drawer
      open={!!drawerUserId}
      onClose={hideUserDrawer}
      width={400}
      // Default AntD close × is on the LEFT; old iView site puts it on the
      // RIGHT. Disable the default and render our own via `extra`.
      closable={false}
      extra={
        <CloseOutlined
          onClick={hideUserDrawer}
          className="ml-2 cursor-pointer text-[16px] text-[#999] hover:text-[#333]"
        />
      }
      title={
        <div className="flex items-center pr-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={detail.avatar}
            alt="avatar"
            className="mr-2 h-[30px] w-[30px] rounded-full"
          />
          <span className="text-[#333]">{detail.username}</span>
          <div className="flex-1" />
          {user?.id === detail.id && (
            <Button size="small" type="primary" onClick={logout}>
              退出
            </Button>
          )}
        </div>
      }
    >
      {canSeeEmail && (
        <div className="mb-5">
          <div className="mb-2 border-b border-[rgba(64,158,255,0.5)] pb-1 text-[18px] text-[#409eff]">
            邮箱:{detail.email || '未设置'}
          </div>
          {editingEmail ? (
            <div className="space-y-2">
              <Input
                type="email"
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
              />
              <div className="space-x-2">
                <Button className="btn-success" onClick={saveEmail}>
                  保存
                </Button>
                <Button onClick={() => setEditingEmail(false)}>取消</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-2 text-sm">
                {detail.email
                  ? '别人回复您的评论或者留言时,本站将通过邮箱通知您。'
                  : '您可以设置邮箱,以便及时收到关于您的消息。别人回复您的评论或者留言时,本站将通过邮箱通知您。'}
              </div>
              <Button
                size="small"
                className="btn-success"
                onClick={() => {
                  setEmailValue(detail.email || '')
                  setEditingEmail(true)
                }}
              >
                {detail.email ? '更改邮箱' : '设置邮箱'}
              </Button>
            </>
          )}
        </div>
      )}
      <div>
        <div className="mb-2 border-b border-[rgba(64,158,255,0.5)] pb-1 text-[18px] text-[#409eff]">
          相关动态
        </div>
        {/* Wrap activities in their own container so `first:border-0`
            actually targets the first activity row instead of trying to
            be the first child relative to the section header above. */}
        <div>
          {activities.map((a, i) => (
            <div
              key={i}
              className="border-t border-[#ccc] p-[10px] text-sm first:border-t-0"
            >
              <div className="break-all">
                <span className="mr-2 font-bold text-[#FF8700]">
                  {timeShow(a.timestamp)}
                </span>
                {a.type === 1 && '赞了文章'}
                {a.type === 2 && '在留言板留言'}
                {a.type === 3 && '评论了文章'}
                {a.postId ? (
                  <Link
                    href={`/article/${a.postId}`}
                    className="ml-1 text-[#2d8cf0] hover:underline"
                  >
                    {a.postTitle}
                  </Link>
                ) : null}
              </div>
              {'body' in a && a.body && (
                <div className="mt-1 break-all rounded bg-[#eee] p-1">
                  {a.body}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Drawer>
  )
}
