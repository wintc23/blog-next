'use client'
import { useState } from 'react'
import { Alert, App, Button, Modal, Select, Spin } from 'antd'
import { apiFetch } from '@/lib/api/client'
import { AlbumsSchema, addPhotos, type Album, type PhotoSource } from '@/lib/albums'
import { useUser, useShowLogin } from '@/lib/store'
import AlbumForm from './AlbumForm'
import styles from './Albums.module.css'
export default function AddToAlbum({ sources }: { sources: PhotoSource[] }) {
  const user = useUser(), showLogin = useShowLogin(), { message } = App.useApp()
  const [open, setOpen] = useState(false), [create, setCreate] = useState(false), [busy, setBusy] = useState(false)
  const [albums, setAlbums] = useState<Album[] | null>(null), [selected, setSelected] = useState<string[]>([]), [error, setError] = useState('')
  const load = async () => {
    setAlbums(null); setError('')
    try {
      const first = await apiFetch('/albums/', { params: { scope: 'mine' }, schema: AlbumsSchema })
      const remaining = await Promise.all(Array.from({ length: Math.ceil(first.total / first.perPage) - 1 }, (_, index) => apiFetch('/albums/', { params: { scope: 'mine', page: index + 2 }, schema: AlbumsSchema })))
      setAlbums([...first.list, ...remaining.flatMap(result => result.list)])
    } catch (error) { setError(error instanceof Error ? error.message : '加载失败') }
  }
  return <>
    <Button type="link" onClick={() => { if (!user) { showLogin(); return } setOpen(true); setSelected([]); void load() }}>加入画册</Button>
    <Modal open={open && !create} title="加入画册" onCancel={() => setOpen(false)} okText="添加" cancelText="取消" confirmLoading={busy} okButtonProps={{ disabled: !selected.length || !albums }} onOk={async () => {
      setBusy(true)
      try { for (const id of selected) await addPhotos(id, sources); message.success('已加入画册'); setOpen(false) }
      catch (error) { message.error(error instanceof Error ? error.message : '添加失败，已完成的添加会保留，重试不会重复') }
      finally { setBusy(false) }
    }}>
      <p className={styles.hint}>将 {sources.length} 张图片加入画册，可以多选。</p>
      {error ? <Alert type="error" message={error} action={<Button onClick={load}>重试</Button>} /> : albums ? <Select mode="multiple" style={{ width: '100%' }} placeholder="选择画册" value={selected} onChange={setSelected} options={albums.map(album => ({ value: album.id, label: `${album.title} · ${album.visibility === 'private' ? '私密' : '公开'}` }))} /> : <Spin />}
      <Button type="link" onClick={() => setCreate(true)}>新建画册</Button>
    </Modal>
    {create && <AlbumForm onClose={() => setCreate(false)} onSaved={album => { setCreate(false); setAlbums(previous => [album, ...(previous || [])]); setSelected(previous => [...previous, album.id]) }} />}
  </>
}
