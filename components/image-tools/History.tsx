'use client'
import { useEffect, useState } from 'react'
import { Button, Empty, Spin } from 'antd'
import Link from 'next/link'
import { PictureOutlined } from '@ant-design/icons'
import { z } from 'zod'
import { apiFetch } from '@/lib/api/client'
import { useUser, useShowLogin } from '@/lib/store'
import { labels, AssetSchema, assetUrl, type Asset } from '@/lib/image-tools'
import styles from './Tools.module.css'
const schema = z.object({ tasks: z.array(z.object({ id: z.string(), name: z.string(), status: z.string(), createdAt: z.string(), thumbnail: AssetSchema.nullish(), thumbnailKind: z.string().nullish() })) })
function TaskThumbnail({ asset, kind }: { asset?: Asset | null; kind?: string | null }) {
  const [failed, setFailed] = useState(false)
  return <span className={styles.historyThumbnail}>
    {asset && !failed ? <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={assetUrl(asset)} alt={kind === 'output' ? '本次生成结果' : '本次上传原图'} width={80} height={80} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
    </> : <span className={styles.historyPlaceholder}><PictureOutlined aria-hidden="true" /><span>{failed ? '图片暂不可用' : '暂无图片'}</span></span>}
  </span>
}
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
    {!user ? <Button type="primary" onClick={showLogin}>登录查看任务</Button> : error ? <div role="alert" className={styles.error}>{error}<Button onClick={() => setReload(v => v + 1)}>重试</Button></div> : !rows ? <Spin /> : <div className={styles.history}>{rows.map(row => <Link href={`/tools/tasks/${row.id}`} key={row.id}><TaskThumbnail key={row.thumbnail?.url || row.id} asset={row.thumbnail} kind={row.thumbnailKind} /><div className={styles.historyDetails}><strong>{row.name}</strong><div className={styles.hint}>{new Date(row.createdAt).toLocaleString()}</div><span className={styles.historyStatus}>{labels[row.status] || row.status}</span></div></Link>)}{!rows.length && <Empty className={styles.historyEmpty} image={false} description="暂无图片任务"><Button type="link" href="/products">去创作</Button></Empty>}</div>}
  </div>
}
