'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Alert, Button, Empty, Pagination, Spin, Tabs } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api/client'
import { AlbumsSchema, photoUrl, type Album } from '@/lib/albums'
import { useUser, useShowLogin } from '@/lib/store'
import AlbumForm from './AlbumForm'
import styles from './Albums.module.css'
export default function AlbumList() {
  const user = useUser(), showLogin = useShowLogin(), router = useRouter()
  const [scope, setScope] = useState('public'), [page, setPage] = useState(1)
  const [data, setData] = useState<{ list: Album[]; total: number; perPage: number } | null>(null)
  const [error, setError] = useState(''), [retry, setRetry] = useState(0), [create, setCreate] = useState(false)
  useEffect(() => {
    setData(null); setError('')
    if (scope === 'mine' && !user) return
    const controller = new AbortController()
    apiFetch('/albums/', { params: { scope, page }, schema: AlbumsSchema, signal: controller.signal }).then(setData).catch(error => { if (!controller.signal.aborted) setError(error.message) })
    return () => controller.abort()
  }, [scope, page, user, retry])
  return <div className={styles.page}>
    <header className={styles.header}><div><h1>画册</h1><p>把喜欢的照片放在一起。</p></div><div className={styles.actions}><Link href="/products">探索</Link><Button type="primary" icon={<PlusOutlined />} onClick={() => user ? setCreate(true) : showLogin()}>新建画册</Button></div></header>
    <Tabs activeKey={scope} onChange={key => { setScope(key); setPage(1) }} items={[{ key: 'public', label: '公开画册' }, { key: 'mine', label: '我的画册' }]} />
    {scope === 'mine' && !user ? <div className={styles.empty}><p>登录后查看和整理自己的画册。</p><Button type="primary" onClick={showLogin}>登录</Button></div> : error ? <Alert type="error" message={error} action={<Button onClick={() => setRetry(n => n + 1)}>重试</Button>} /> : !data ? <Spin /> : <>
      {!data.list.length ? <div className={styles.empty}><Empty description={scope === 'mine' ? '还没有画册' : '还没有公开画册'} /></div> : <div className={styles.grid}>{data.list.map(album => <Link key={album.id} href={`/albums/${album.id}`} className={styles.card}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {album.cover ? <img className={styles.cover} src={photoUrl(album.cover)} alt={album.title} loading="lazy" /> : <div className={styles.cover}>等待第一张照片</div>}
        <div className={styles.cardText}><h2>{album.title}</h2><span className={styles.hint}>{album.count} 张 · {album.visibility === 'private' ? '私密' : '公开'}</span></div>
      </Link>)}</div>}
      <Pagination current={page} total={data.total} pageSize={data.perPage} onChange={setPage} showSizeChanger={false} hideOnSinglePage />
    </>}
    {create && <AlbumForm onClose={() => setCreate(false)} onSaved={album => router.push(`/albums/${album.id}`)} />}
  </div>
}
