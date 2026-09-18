'use client'
import { v4 as uuidv4 } from 'uuid'

import { Modal, App, Button } from 'antd'
import { GithubOutlined, MailOutlined, UserOutlined } from '@ant-design/icons'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  useLoginVisible,
  useHideLogin,
  useRefreshUser,
  useAppStore,
} from '@/lib/store'
import { GITHUB_CLIENT_ID, QQ_CLIENT_ID } from '@/lib/config'
import { isPC } from '@/lib/is-pc'
import { getTokenClient, setTokenClient } from '@/lib/utils'
import type { User } from '@/lib/schemas/user'
import EmailLoginForm from './EmailLoginForm'
import styles from './LoginModal.module.css'

export default function LoginModal() {
  const loginVisible = useLoginVisible()
  const hideLogin = useHideLogin()
  const refresh = useRefreshUser()
  const setUser = useAppStore((s) => s.setUser)
  const ensureUser = useAppStore((s) => s.ensureUser)
  const { message } = App.useApp()
  const [guestPending, setGuestPending] = useState(false)
  const [emailMode, setEmailMode] = useState(false)
  const [emailPending, setEmailPending] = useState(false)
  const pending = guestPending || emailPending
  const guestRequest = useRef(false)
  const loginCompleted = useRef(false)
  const emailButton = useRef<HTMLButtonElement>(null)

  const completeLogin = (result: { token: string; user: User }) => {
    setTokenClient(result.token)
    if (getTokenClient() !== result.token) {
      throw new Error('请允许本站保存 Cookie 后重试')
    }
    setUser(result.user)
    loginCompleted.current = true
    hideLogin()
  }

  const loginAsGuest = async () => {
    if (guestRequest.current) return
    guestRequest.current = true
    setGuestPending(true)
    try {
      await ensureUser()
      loginCompleted.current = true
      hideLogin()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '游客登录失败，请重试')
    } finally {
      guestRequest.current = false
      setGuestPending(false)
    }
  }

  const openLoginWindow = (url: string) => {
    // Always remember where the user came from so the same-window
    // redirect path (mobile, or popup-blocked PC fallback) can return
    // them to where they were after the OAuth round-trip.
    try {
      localStorage.setItem(
        'loginRedirect',
        window.location.pathname + window.location.search,
      )
    } catch {}
    if (!isPC()) {
      window.open(url, '_self')
      return
    }
    // PC: try a popup first. window.open returns null (or an
    // immediately-closed window) when the browser blocks the popup —
    // detect both, warn the user, and fall back to a same-window
    // navigation so the login flow still completes.
    let popup: Window | null = null
    try {
      popup = window.open(
        url,
        'login',
        'resizable=yes,scrollbars=yes,status=yes,height=600,width=800',
      )
    } catch {
      popup = null
    }
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      message.warning('浏览器拦截了登录弹窗，将在当前页面打开登录')
      window.open(url, '_self')
      return
    }
    // Re-focus the popup if it already existed (window.open with the
    // same name reuses an existing window — this lifts it back on top
    // of any windows that may be hiding it).
    try {
      popup.focus()
    } catch {}
  }

  const loginWithGithub = () => {
    const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=user:email`
    openLoginWindow(url)
  }

  const loginWithQQ = () => {
    const state = uuidv4()
    try {
      localStorage.setItem('qqState', state)
    } catch {}
    const redirect = encodeURI(`${window.location.origin}/qqtoken`)
    const url = `https://graph.qq.com/oauth2.0/authorize?response_type=code&client_id=${QQ_CLIENT_ID}&redirect_uri=${redirect}&state=${state}`
    openLoginWindow(url)
  }

  const onMessage = useCallback(
    (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return
      const { type, state } = (e.data || {}) as {
        type?: string
        state?: boolean
      }
      if (type !== 'login-state') return
      if (state) {
        refresh()
          .then((user) => {
            loginCompleted.current = true
            hideLogin()
            if (!user.email) message.info('请设置邮箱,以便及时收到关于您的消息')
          })
          .catch((error) => {
            message.error(error instanceof Error ? `登录信息获取失败：${error.message}` : '登录信息获取失败，请重试')
          })
      } else {
        message.error('登录失败,请重试')
      }
    },
    [hideLogin, refresh, message],
  )

  useEffect(() => {
    if (!loginVisible) return
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [loginVisible, onMessage])

  return (
    <Modal
      open={loginVisible}
      onCancel={hideLogin}
      title={emailMode ? '邮箱登录' : '登录'}
      footer={null}
      width={360}
      centered
      closable={!pending}
      maskClosable={!pending}
      keyboard={!pending}
      afterClose={() => {
        window.dispatchEvent(new CustomEvent('site-login-closed', { detail: loginCompleted.current }))
        loginCompleted.current = false
        setEmailMode(false)
      }}
    >
      <div hidden={!emailMode}>
        <EmailLoginForm active={loginVisible && emailMode} onPending={setEmailPending} onSuccess={completeLogin} onBack={() => {
          setEmailMode(false)
          requestAnimationFrame(() => emailButton.current?.focus())
        }} />
      </div>
      <div hidden={emailMode}>
      <div className={styles.methods} role="group" aria-label="正式登录方式">
        <button
          type="button"
          disabled={guestPending}
          onClick={loginWithQQ}
          className={styles.method}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            draggable={false}
            src="https://file.wintc.top/qq.jpg"
            alt=""
            className={styles.icon}
          />
          <span>QQ 登录</span>
        </button>
        <button
          type="button"
          disabled={guestPending}
          onClick={loginWithGithub}
          className={styles.method}
        >
          <GithubOutlined aria-hidden="true" className={styles.icon} />
          <span>GitHub 登录</span>
        </button>
        <button ref={emailButton} type="button" disabled={pending} onClick={() => setEmailMode(true)} className={styles.method}>
          <MailOutlined aria-hidden="true" className={styles.icon} />
          <span>邮箱登录</span>
        </button>
      </div>
      <div className="my-3 border-t border-[var(--site-border)]" />
      <div className="pt-3">
        <Button
          type="default"
          size="large"
          block
          icon={<UserOutlined aria-hidden="true" />}
          loading={guestPending}
          onClick={loginAsGuest}
          aria-describedby="guest-login-description"
        >
          游客登录
        </Button>
        <p id="guest-login-description" className="mb-0 mt-3 text-center text-sm text-[var(--site-text-secondary)]">
          无需注册，自动生成昵称和头像
        </p>
        <p className="mb-0 mt-1 text-center text-xs leading-5 text-[var(--site-text-secondary)]">
          登录有效期 30 天，设置邮箱后可通过验证码找回
        </p>
      </div>

      </div>
    </Modal>
  )
}
