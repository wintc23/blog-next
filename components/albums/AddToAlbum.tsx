'use client'
import { useState } from 'react'
import { Alert, App, Button, Checkbox, Modal, Spin } from 'antd'
import { PlusOutlined, LockOutlined, GlobalOutlined } from '@ant-design/icons'
import { apiFetch } from '@/lib/api/client'
import { AlbumsSchema, addPhotos, sourceKey, type Album, type PhotoSource } from '@/lib/albums'
import { useUser } from '@/lib/store'
import AlbumForm from './AlbumForm'
import styles from './Albums.module.css'
export default function AddToAlbum({ sources, onAdded, pictures }: { sources: PhotoSource[]; onAdded?: () => void; pictures?: { url: string; name: string }[] }) {
  const user = useUser(), { message } = App.useApp()
  const [open, setOpen] = useState(false), [create, setCreate] = useState(false), [busy, setBusy] = useState(false)
  const [albums, setAlbums] = useState<Album[] | null>(null), [selected, setSelected] = useState<string[]>([]), [error, setError] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const chosen = pictures ? sources.filter(source => picked.includes(sourceKey(source))) : sources
  const load = async () => {
    setAlbums(null); setError('')
    try {
      const first = await apiFetch('/albums/', { params: { scope: 'mine' }, schema: AlbumsSchema })
      const remaining = await Promise.all(Array.from({ length: Math.ceil(first.total / first.perPage) - 1 }, (_, index) => apiFetch('/albums/', { params: { scope: 'mine', page: index + 2 }, schema: AlbumsSchema })))
      setAlbums([...first.list, ...remaining.flatMap(result => result.list)])
    } catch (error) { setError(error instanceof Error ? error.message : '加载失败') }
  }
  if (!user?.admin) return null
  return <>
    <Button type="link" disabled={!sources.length} onClick={() => { setOpen(true); setSelected([]); setPicked([]); void load() }}>{pictures ? '选图加入画册' : '加入画册'}</Button>
    <Modal open={open && !create} title="加入画册" onCancel={() => { if (!busy) setOpen(false) }} okText="添加" cancelText="取消" confirmLoading={busy} okButtonProps={{ disabled: !selected.length || !albums || !chosen.length }} onOk={async () => {
      setBusy(true)
      try { for (const id of selected) await addPhotos(id, chosen); message.success('已加入画册'); setOpen(false); onAdded?.() }
      catch (error) { message.error(error instanceof Error ? error.message : '添加失败，已完成的添加会保留，重试不会重复') }
      finally { setBusy(false) }
    }}>
      <p className={styles.hint}>将 {chosen.length} 张图片加入画册，可以多选。</p>
      {pictures && <div className={styles.picker}>{sources.map((source, index) => <div key={sourceKey(source)} className={`${styles.choice} ${picked.includes(sourceKey(source)) ? styles.selected : ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}<img src={pictures[index]?.url} alt={pictures[index]?.name || `图片 ${index + 1}`} />
        <Checkbox aria-label={`选择${pictures[index]?.name || `图片 ${index + 1}`}`} checked={picked.includes(sourceKey(source))} onChange={event => setPicked(values => event.target.checked ? [...values, sourceKey(source)] : values.filter(key => key !== sourceKey(source)))} />
      </div>)}</div>}
      {error ? <Alert type="error" message={error} action={<Button onClick={load}>重试</Button>} /> : albums ? <div className={styles.albumTags} role="group" aria-label="选择画册，可多选">
        {albums.map(album => <Button key={album.id} className={styles.albumTag} type={selected.includes(album.id) ? 'primary' : 'default'} aria-pressed={selected.includes(album.id)} disabled={busy} icon={album.visibility === 'private' ? <LockOutlined /> : <GlobalOutlined />} onClick={() => setSelected(values => values.includes(album.id) ? values.filter(id => id !== album.id) : [...values, album.id])}>{album.title}</Button>)}
        <Button className={styles.albumTag} type="dashed" icon={<PlusOutlined />} disabled={busy} onClick={() => setCreate(true)}>新建画册</Button>
      </div> : <Spin />}

    </Modal>
    {create && <AlbumForm onClose={() => setCreate(false)} onSaved={album => { setCreate(false); setAlbums(previous => [album, ...(previous || [])]); setSelected(previous => [...previous, album.id]) }} />}
  </>
}
