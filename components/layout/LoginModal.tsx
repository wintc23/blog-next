'use client'

import { Modal, App } from 'antd'
import { GithubOutlined } from '@ant-design/icons'
import { useCallback, useEffect } from 'react'
import {
  useLoginVisible,
  useHideLogin,
  useRefreshUser,
} from '@/lib/store'
import { GITHUB_CLIENT_ID, QQ_CLIENT_ID } from '@/lib/config'
import { isPC } from '@/lib/is-pc'

export default function LoginModal() {
  const loginVisible = useLoginVisible()
  const hideLogin = useHideLogin()
  const refresh = useRefreshUser()
  const { message } = App.useApp()

  const openLoginWindow = (url: string) => {
    if (isPC()) {
      window.open(
        url,
        'login',
        'resizable=yes,scrollbars=yes,status=yes,height=600,width=800',
      )
    } else {
      try {
        localStorage.setItem(
          'loginRedirect',
          window.location.pathname + window.location.search,
        )
      } catch {}
      window.open(url, '_self')
    }
  }

  const loginWithGithub = () => {
    const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=user:email`
    openLoginWindow(url)
  }

  const loginWithQQ = () => {
    const state = crypto.randomUUID()
    try {
      localStorage.setItem('qqState', state)
    } catch {}
    const redirect = encodeURI(`${window.location.origin}/qqtoken`)
    const url = `https://graph.qq.com/oauth2.0/authorize?response_type=code&client_id=${QQ_CLIENT_ID}&redirect_uri=${redirect}&state=${state}`
    openLoginWindow(url)
  }

  const onMessage = useCallback(
    (e: MessageEvent) => {
      const { type, state } = (e.data || {}) as {
        type?: string
        state?: boolean
      }
      if (type !== 'login-state') return
      if (state) {
        hideLogin()
        refresh().then(() => {
          message.info('请设置邮箱,以便及时收到关于您的消息')
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
      title="登录"
      footer={null}
      width={300}
      centered
    >
      <div className="flex items-center justify-around py-4">
        <div
          onClick={loginWithQQ}
          className="w-[120px] cursor-pointer select-none rounded-lg p-2 text-center hover:bg-[#f6f6f6] hover:shadow"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            draggable={false}
            src="https://file.wintc.top/qq.jpg"
            alt="qq登录"
            className="mx-auto h-14 w-14 rounded-full"
          />
          <div className="pt-2">QQ登录</div>
        </div>
        <div
          onClick={loginWithGithub}
          className="w-[120px] cursor-pointer select-none rounded-lg p-2 text-center hover:bg-[#f6f6f6] hover:shadow"
        >
          <GithubOutlined className="text-[56px]" />
          <div className="pt-2">github登录</div>
        </div>
      </div>
    </Modal>
  )
}
