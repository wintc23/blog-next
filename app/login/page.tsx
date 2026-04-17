'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { githubLogin } from '@/lib/api/users'
import { setTokenClient } from '@/lib/utils'

/**
 * Module-level guard. Survives React 19 Strict Mode double-effect so the
 * one-time GitHub `code` is only exchanged once — GitHub returns 400
 * `bad_verification_code` on the second exchange.
 */
const processedCodes = new Set<string>()

function notify(ok: boolean) {
  // PC popup mode: message the opener and close ourselves.
  if (window.opener) {
    try {
      window.opener.postMessage({ type: 'login-state', state: ok }, '*')
    } catch {}
    window.close()
    return
  }
  // Mobile same-window mode: redirect to the path saved before OAuth.
  let redirect = '/'
  try {
    redirect = localStorage.getItem('loginRedirect') || '/'
    localStorage.removeItem('loginRedirect')
  } catch {}
  window.location.replace(redirect)
}

function LoginInner() {
  const sp = useSearchParams()
  const [status, setStatus] = useState('正在进行第三方登录,请稍候…')

  useEffect(() => {
    const code = sp?.get('code')
    if (!code) {
      setStatus('缺少 code 参数')
      return
    }
    if (processedCodes.has(code)) return
    processedCodes.add(code)

    console.log('[login] exchanging code', code.slice(0, 6) + '…')
    githubLogin(code)
      .then((res) => {
        console.log('[login] backend response', res)
        if (res?.token) {
          setTokenClient(res.token)
          setStatus('登录成功,正在跳转…')
          notify(true)
        } else {
          setStatus('登录失败: 后端未返回 token')
          notify(false)
        }
      })
      .catch((err) => {
        console.error('[login] failed', err)
        setStatus(`登录失败: ${err?.message || '未知错误'}`)
        notify(false)
      })
  }, [sp])

  return <div className="p-10 text-center text-[#666]">{status}</div>
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">加载中…</div>}>
      <LoginInner />
    </Suspense>
  )
}
