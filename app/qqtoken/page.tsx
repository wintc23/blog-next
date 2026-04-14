'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { qqLogin } from '@/lib/api/users'
import { setTokenClient } from '@/lib/utils'

const processedCodes = new Set<string>()

function notify(ok: boolean) {
  if (window.opener) {
    try {
      window.opener.postMessage({ type: 'login-state', state: ok }, '*')
    } catch {}
    window.close()
    return
  }
  let redirect = '/'
  try {
    redirect = localStorage.getItem('loginRedirect') || '/'
    localStorage.removeItem('loginRedirect')
  } catch {}
  window.location.replace(redirect)
}

function QQTokenInner() {
  const sp = useSearchParams()
  const [status, setStatus] = useState('正在进行第三方登录,请稍候…')

  useEffect(() => {
    const code = sp.get('code')
    const state = sp.get('state')
    if (!code) {
      setStatus('缺少 code 参数')
      return
    }
    if (processedCodes.has(code)) return
    processedCodes.add(code)

    let savedState: string | null = null
    try {
      savedState = localStorage.getItem('qqState')
      localStorage.removeItem('qqState')
    } catch {}
    if (savedState !== state) {
      setStatus('QQ登录状态异常,请重试')
      notify(false)
      return
    }

    const redirect = encodeURI(`${window.location.origin}/qqtoken`)
    qqLogin({ code, redirect })
      .then((res) => {
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
        setStatus(`登录失败: ${err?.message || '未知错误'}`)
        notify(false)
      })
  }, [sp])

  return <div className="p-10 text-center text-[#666]">{status}</div>
}

export default function QQTokenPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">加载中…</div>}>
      <QQTokenInner />
    </Suspense>
  )
}
