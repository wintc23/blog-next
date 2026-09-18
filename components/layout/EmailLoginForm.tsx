'use client'

import { Button, Input } from 'antd'
import type { InputRef } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { emailLogin, requestEmailCode } from '@/lib/api/users'
import { ApiError } from '@/lib/api/client'
import type { User } from '@/lib/schemas/user'

interface Props {
  active: boolean
  onPending: (pending: boolean) => void
  onSuccess: (result: { token: string; user: User }) => void
  onBack: () => void
}

export default function EmailLoginForm({ active, onPending, onSuccess, onBack }: Props) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [expiresAt, setExpiresAt] = useState(0)
  const [retryAt, setRetryAt] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [pending, setPending] = useState<'send' | 'login' | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const requestPending = useRef(false)
  const emailInput = useRef<InputRef>(null)
  const codeInput = useRef<InputRef>(null)

  useEffect(() => {
    if (active) emailInput.current?.focus()
    else {
      setCode('')
      setChallengeId('')
      setError('')
      setNotice('')
    }
  }, [active])

  useEffect(() => {
    const tick = () => setSeconds(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)))
    tick()
    if (!retryAt) return
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [retryAt])

  const start = (kind: 'send' | 'login') => {
    if (requestPending.current) return false
    requestPending.current = true
    setPending(kind)
    onPending(true)
    setError('')
    return true
  }

  const finish = () => {
    requestPending.current = false
    setPending(null)
    onPending(false)
  }

  const showError = (cause: unknown) => {
    setError(cause instanceof Error ? cause.message : '操作失败，请稍后重试')
    if (cause instanceof ApiError && cause.data && typeof cause.data === 'object' && 'retryAfter' in cause.data) {
      const wait = Number(cause.data.retryAfter)
      if (Number.isFinite(wait) && wait > 0) setRetryAt(Date.now() + wait * 1000)
    }
  }

  const send = async () => {
    if (!emailInput.current?.input?.reportValidity() || Date.now() < retryAt || !start('send')) return
    setNotice('')
    setChallengeId('')
    setCode('')
    try {
      const result = await requestEmailCode(email.trim())
      setChallengeId(result.challengeId)
      setExpiresAt(Date.now() + result.expiresIn * 1000)
      setRetryAt(Date.now() + result.retryAfter * 1000)
      setNotice(`验证码已发送，${Math.ceil(result.expiresIn / 60)} 分钟内有效。未收到时可检查垃圾邮件。`)
      codeInput.current?.focus()
    } catch (cause) {
      showError(cause)
    } finally {
      finish()
    }
  }

  const login = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!challengeId) {
      setError('请先获取验证码')
      return
    }
    if (Date.now() >= expiresAt) {
      setError('验证码已过期，请重新获取')
      return
    }
    if (!start('login')) return
    try {
      onSuccess(await emailLogin({ email: email.trim(), code, challengeId }))
    } catch (cause) {
      showError(cause)
      codeInput.current?.focus()
    } finally {
      finish()
    }
  }

  return (
    <form onSubmit={login} className="pt-3">
      <label htmlFor="login-email" className="mb-2 block text-sm">邮箱</label>
      <Input
        ref={emailInput}
        id="login-email"
        name="email"
        type="email"
        autoComplete="username"
        required
        maxLength={64}
        size="large"
        readOnly={!!pending}
        placeholder="请输入邮箱地址"
        value={email}
        onChange={(event) => {
          setEmail(event.target.value)
          setChallengeId('')
          setCode('')
          setError('')
          setNotice('')
        }}
      />
      <label htmlFor="login-email-code" className="mb-2 mt-4 block text-sm">验证码</label>
      <div className="flex gap-2">
        <Input
          ref={codeInput}
          id="login-email-code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          enterKeyHint="done"
          pattern="[0-9]{6}"
          required
          size="large"
          className="min-w-0 flex-1"
          readOnly={!!pending}
          placeholder="6 位验证码"
          value={code}
          aria-describedby={error ? 'email-login-error' : 'email-login-notice'}
          onChange={(event) => {
            setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
            setError('')
          }}
        />
        <Button htmlType="button" size="large" onClick={send} loading={pending === 'send'} disabled={!!pending || seconds > 0}>
          {seconds > 0 ? `${seconds} 秒后重发` : challengeId ? '重新发送' : '获取验证码'}
        </Button>
      </div>
      <p id="email-login-notice" role="status" className="mb-0 mt-3 text-xs leading-5 text-[var(--site-text-secondary)]">
        {notice || '未注册的邮箱将自动创建账号，生成昵称和头像。'}
      </p>
      {error && <p id="email-login-error" role="alert" className="mb-0 mt-2 text-sm text-[#c42828]">{error}</p>}
      <Button type="primary" htmlType="submit" size="large" block className="mt-5" loading={pending === 'login'} disabled={!!pending || !challengeId}>
        登录
      </Button>
      <Button type="text" htmlType="button" block className="mt-2" onClick={onBack} disabled={!!pending}>
        其他登录方式
      </Button>
    </form>
  )
}
