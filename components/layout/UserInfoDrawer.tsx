'use client'

import { Drawer, Button, Input, App, Popconfirm } from 'antd'
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
import RichCommentBody from '../RichCommentBody'

interface UserDetail {
  id: number
  username: string
  avatar: string
  isGuest?: boolean
  email?: string
  likes: { timestamp: number; postId: number; postTitle: string }[]
  messages: { timestamp: number; body?: string }[]
  comments: { timestamp: number; body?: string; postId: number; postTitle: string; digestId?: number; targetUrl?: string }[]
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

  useEffect(() => {
    setDetail(null)
  }, [user?.id, user?.isGuest, user?.email])

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

  // Mobile back-button integration: while the drawer is open, push a
  // synthetic history entry. Pressing the system / browser back button
  // pops that entry, which fires popstate; we close the drawer instead
  // of letting the navigation propagate. If the user closes the drawer
  // via the × / mask, we pop the entry ourselves so history doesn't
  // accumulate. Listener removal happens before our own pop so the
  // popstate it fires doesn't re-trigger `hideUserDrawer`.
  useEffect(() => {
    if (!drawerUserId) return
    const marker = '__userdrawer__'
    window.history.pushState({ blogNextDrawer: marker }, '')
    const onPop = () => {
      hideUserDrawer()
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      const state = window.history.state as { blogNextDrawer?: string } | null
      if (state?.blogNextDrawer === marker) {
        window.history.back()
      }
    }
  }, [drawerUserId, hideUserDrawer])

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
      try {
        await Promise.all([load(detail.id), refresh()])
        message.success('保存成功')
      } catch {
        message.warning('邮箱已保存，用户信息暂时无法刷新，请稍后重试')
      }
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
          className="ml-2 cursor-pointer text-base text-[var(--site-text-disabled)] hover:text-[var(--site-text)]"
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
          <span className="text-[var(--site-text)]">{detail.username}</span>
          <div className="flex-1" />
          {user?.id === detail.id && (user.isGuest && !detail.email ? (
            <Popconfirm
              title="退出游客身份？"
              description="尚未设置邮箱，退出后无法找回当前身份。已发表的内容会保留。"
              okText="退出"
              cancelText="取消"
              onConfirm={logout}
            >
              <Button size="small">退出</Button>
            </Popconfirm>
          ) : (
            <Button size="small" type="primary" onClick={logout}>
              退出
            </Button>
          ))}
        </div>
      }
    >
      {user?.id === detail.id && detail.isGuest && (
        <p className="mb-5 text-sm leading-6 text-[var(--site-text-secondary)]">
          {detail.email
            ? '当前使用游客身份，登录有效期为 30 天。下次可通过已设置的邮箱获取验证码，登录同一账号。'
            : '当前使用游客身份，登录有效期为 30 天。设置邮箱后可通过验证码找回账号，保留昵称、头像和已发表的内容。'}
        </p>
      )}
      {canSeeEmail && (
        <div className="mb-5">
          <div className="mb-2 border-b border-[rgba(64,158,255,0.5)] pb-1 text-lg text-[var(--site-primary)]">
            邮箱：{detail.email || '未设置'}
          </div>
          {editingEmail ? (
            <div className="space-y-2">
              <Input
                type="email"
                aria-label="邮箱"
                autoComplete="email"
                maxLength={64}
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
                  ? '用于接收评论和留言的回复通知，也可通过验证码登录。'
                  : '用于接收回复通知和找回账号。设置时无需验证，使用邮箱登录时才需要验证码。'}
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
        <div className="mb-2 border-b border-[rgba(64,158,255,0.5)] pb-1 text-lg text-[var(--site-primary)]">
          相关动态
        </div>
        {/* Wrap activities in their own container so `first:border-0`
            actually targets the first activity row instead of trying to
            be the first child relative to the section header above. */}
        <div>
          {activities.map((a, i) => (
            <div
              key={i}
              className="border-t border-[var(--site-border)] p-[10px] text-sm first:border-t-0"
            >
              <div className="break-all">
                <span className="mr-2 font-bold text-[#FF8700]">
                  {timeShow(a.timestamp)}
                </span>
                {a.type === 1 && '赞了文章'}
                {a.type === 2 && '在留言板留言'}
                {a.type === 3 && ('digestId' in a && a.digestId ? '评论了 AI 快讯' : '评论了文章')}
                {a.postId || ('digestId' in a && a.digestId) ? (
                  <Link
                    href={'digestId' in a && a.digestId ? `/ai-news/${a.digestId}#comments` : `/article/${a.postId}#comments`}
                    className="ml-1 text-[var(--site-primary)] hover:underline"
                  >
                    {a.postTitle}
                  </Link>
                ) : null}
              </div>
              {'body' in a && a.body && (
                <div className="mt-1 break-all rounded bg-[var(--site-hover-bg)] p-1">
                  <RichCommentBody body={a.body} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Drawer>
  )
}
