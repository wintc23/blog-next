'use client'
import { useEffect, useRef, useState } from 'react'
import { Alert, App, Button, Modal, QRCode, Spin, Typography } from 'antd'
import { QrcodeOutlined } from '@ant-design/icons'
import { v4 as uuid } from 'uuid'
import { z } from 'zod'
import { apiFetch } from '@/lib/api/client'
import { setTokenClient } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import styles from './DeviceLogin.module.css'
const sessionSchema = z.object({ id: z.string(), scanToken: z.string(), expiresIn: z.number() })
const stateSchema = z.object({ status: z.string(), code: z.string().nullable().optional(), token: z.string().optional() })

export function PhonePublishButton() {
  const { message } = App.useApp()
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [session, setSession] = useState<z.infer<typeof sessionSchema> | null>(null)
  const [state, setState] = useState({ status: 'waiting', code: '' }), [origin, setOrigin] = useState('')
  const active = useRef(''), generation = useRef(0)
  useEffect(() => { setOrigin(window.location.origin); return () => { generation.current++; if (active.current) void apiFetch(`/device-logins/${active.current}/`, { method: 'DELETE' }).catch(() => {}) } }, [])
  const start = async () => {
    const attempt = ++generation.current
    setOpen(true); setBusy(true); setError(''); setSession(null)
    try { const value = await apiFetch('/device-logins/', { method: 'POST', data: {}, schema: sessionSchema }); if (attempt !== generation.current) { void apiFetch(`/device-logins/${value.id}/`, { method: 'DELETE' }).catch(() => {}); return } active.current = value.id; setSession(value); setState({ status: 'waiting', code: '' }) }
    catch (e) { setError(e instanceof Error ? e.message : '无法创建二维码') }
    finally { setBusy(false) }
  }
  const close = () => { generation.current++; const id = active.current; active.current = ''; setOpen(false); setSession(null); if (id) void apiFetch(`/device-logins/${id}/`, { method: 'DELETE' }).catch(() => {}) }
  useEffect(() => {
    if (!open || !session) return
    const controller = new AbortController(); let pending = false
    const poll = async () => {
      if (pending) return
      pending = true
      try { const value = await apiFetch(`/device-logins/${session.id}/`, { schema: stateSchema, signal: controller.signal }); if (!controller.signal.aborted) { setState({ status: value.status, code: value.code || '' }); setError('') } }
      catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : '无法连接服务') }
      finally { pending = false }
    }
    void poll(); const timer = setInterval(() => void poll(), 1500)
    return () => { controller.abort(); clearInterval(timer) }
  }, [open, session])
  const approve = async () => {
    if (!session) return
    setBusy(true)
    try { await apiFetch(`/device-logins/${session.id}/`, { method: 'PATCH', data: { code: state.code } }); setState(value => ({ ...value, status: 'approved' })); message.success('已确认，请在手机上继续') }
    catch (e) { setError(e instanceof Error ? e.message : '确认失败') }
    finally { setBusy(false) }
  }
  return <><Button icon={<QrcodeOutlined />} onClick={() => void start()}>手机发布</Button><Modal title="在手机上继续发布" open={open} onCancel={close} footer={null}>
    <div className={styles.panel}>{error && <Alert type="error" message={error} />}{busy && !session ? <Spin /> : session && <>
      {state.status === 'waiting' && <><QRCode value={`${origin}/device-login#${session.id}.${session.scanToken}`} size={200} /><p>用手机扫码，二维码 5 分钟内有效。</p></>}
      {state.status === 'scanned' && <><p>请核对手机上的确认码</p><Typography.Title level={2} className={styles.code}>{state.code}</Typography.Title><p>确认后，这台手机将以你的账号登录。</p><Button type="primary" loading={busy} onClick={() => void approve()}>确认这台手机登录</Button></>}
      {state.status === 'approved' && <p>已确认，等待手机接续登录…</p>}
      {state.status === 'consumed' && <Alert type="success" message="手机已登录，可以发布动态了" />}
      {['expired', 'cancelled'].includes(state.status) && <Alert type="info" message="二维码已失效" />}
    </>}<Button type="link" onClick={() => void start()} disabled={busy}>重新生成二维码</Button></div>
  </Modal></>
}

export default function DeviceLoginPage() {
  const router = useRouter(), refreshUser = useAppStore(store => store.refreshUser)
  const [code, setCode] = useState(''), [error, setError] = useState(''), [done, setDone] = useState(false)
  useEffect(() => {
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined
    const run = async () => {
      try {
        let pending: { id: string; clientSecret: string; code?: string }
        const fragment = window.location.hash.slice(1)
        if (fragment) {
          const [id, scanToken] = fragment.split('.')
          if (!/^[a-f0-9]{32}$/.test(id || '') || !scanToken) throw new Error('二维码无效，请在电脑上重新生成')
          const saved = JSON.parse(sessionStorage.getItem('device-login-pending') || 'null')
          pending = saved?.id === id ? saved : { id, clientSecret: uuid() + uuid() }
          sessionStorage.setItem('device-login-pending', JSON.stringify(pending))
          const value = await apiFetch(`/device-logins/${id}/claim/`, { method: 'POST', data: { scanToken, clientSecret: pending.clientSecret }, schema: stateSchema, signal: controller.signal })
          pending.code = value.code || ''; sessionStorage.setItem('device-login-pending', JSON.stringify(pending))
          window.history.replaceState(null, '', window.location.pathname)
        } else {
          pending = JSON.parse(sessionStorage.getItem('device-login-pending') || 'null')
          if (!pending?.id) throw new Error('请先扫描电脑上的登录二维码')
        }
        if (controller.signal.aborted) return
        setCode(pending.code || '')
        const poll = async () => {
          try {
            const value = await apiFetch(`/device-logins/${pending.id}/consume/`, { method: 'POST', data: { clientSecret: pending.clientSecret }, schema: stateSchema, signal: controller.signal })
            if (controller.signal.aborted) return
            if (value.token) { setTokenClient(value.token); await refreshUser(); sessionStorage.removeItem('device-login-pending'); setDone(true); router.replace('/manage/moments'); return }
            timer = setTimeout(() => void poll(), 1500)
          } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : '登录请求已失效，请重新扫码') }
        }
        void poll()
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : '无法登录，请重新扫码') }
    }
    void run()
    return () => { controller.abort(); if (timer) clearTimeout(timer) }
  }, [refreshUser, router])
  return <section className={styles.phone}><h1>手机登录</h1>{error ? <Alert type="error" message={error} /> : done ? <p>登录成功，正在打开发布页…</p> : <><p>请在电脑上核对确认码并允许登录。</p>{code ? <Typography.Title level={2} className={styles.code}>{code}</Typography.Title> : <Spin />}<p>确认前，手机不会获得账号权限。</p></>}</section>
}
