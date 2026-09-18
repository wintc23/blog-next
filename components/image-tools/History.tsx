'use client'
import { useEffect, useState } from 'react'
import { Button, Spin } from 'antd'
import Link from 'next/link'
import { z } from 'zod'
import { apiFetch } from '@/lib/api/client'
import { useUser, useShowLogin } from '@/lib/store'
import { labels } from '@/lib/image-tools'
import styles from './Tools.module.css'
const schema = z.object({ tasks: z.array(z.object({ id: z.string(), name: z.string(), status: z.string(), createdAt: z.string() })) })
export default function History() {
  const user = useUser()
  return <UserHistory key={user?.id || 'anonymous'} />
}
function UserHistory() {
  const user = useUser(), showLogin = useShowLogin()
  const [rows, setRows] = useState<z.infer<typeof schema>['tasks'] | null>(null)
  const [error, setError] = useState(''), [reload, setReload] = useState(0)
  useEffect(() => {
    if (!user) return
    const controller = new AbortController()
    apiFetch('/image-tasks/', { schema, signal: controller.signal }).then(result => { setRows(result.tasks); setError('') }).catch(error => { if (!controller.signal.aborted) setError(error instanceof TypeError ? '暂时无法连接服务，请稍后重试。' : error.message || '任务加载失败，请稍后重试。') })
    return () => controller.abort()
  }, [user?.id, reload])
  return <div className={styles.shell}><div className={styles.topline}><Link href="/products">← 返回探索</Link></div><div className={styles.hero}><h1>我的图片任务</h1><p>在任何设备登录同一账号，继续创作、查看进度或下载结果。</p></div>
    {!user ? <Button type="primary" onClick={showLogin}>登录查看任务</Button> : error ? <div role="alert" className={styles.error}>{error}<Button onClick={() => setReload(v => v + 1)}>重试</Button></div> : !rows ? <Spin /> : <div className={styles.history}>{rows.map(row => <Link href={`/tools/tasks/${row.id}`} key={row.id}><div>{row.name}<div className={styles.hint}>{new Date(row.createdAt).toLocaleString()}</div></div><span>{labels[row.status] || row.status}</span></Link>)}{!rows.length && <p>还没有任务，<Link href="/products">开始第一次创作</Link>。</p>}</div>}
  </div>
}
