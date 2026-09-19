'use client'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, App, Button, Dropdown, Empty, Image, Spin, Tag } from 'antd'
import { DeleteOutlined, HolderOutlined, MoreOutlined, PlusOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api/client'
import { AlbumSchema, addPhotos, photoUrl, uploadAlbumPhoto, type Album, type PhotoSource } from '@/lib/albums'
import { IMAGE_UPLOAD_ACCEPT } from '@/lib/image-formats'
import { downloadBlob } from '@/lib/image-tools'
import { useImagePaste } from '@/lib/use-image-paste'
import { useUser, useShowLogin } from '@/lib/store'
import { ShareDialog, useDevice } from '@/components/image-tools/Shared'
import AlbumForm from './AlbumForm'
import PhotoVisibilityButton from '@/components/PhotoVisibilityButton'
import { PhotoSort, SortablePhoto } from '@/components/PhotoSort'
import PhotoPicker from './PhotoPicker'
import styles from './Albums.module.css'
export default function AlbumDetail({ id }: { id: string }) {
  const device = useDevice()
  const { message, modal } = App.useApp(), router = useRouter(), user = useUser(), showLogin = useShowLogin()
  const [album, setAlbum] = useState<Album | null>(null), [error, setError] = useState(''), [retry, setRetry] = useState(0)
  const [busy, setBusy] = useState(false), [edit, setEdit] = useState(false), [picker, setPicker] = useState(false), [share, setShare] = useState(false)
  const editable = !!user?.admin && !!album?.editable
  const input = useRef<HTMLInputElement>(null), working = useRef(false)
  useEffect(() => {
    setAlbum(null); setError(''); const controller = new AbortController()
    apiFetch(`/albums/${id}/`, { schema: AlbumSchema, signal: controller.signal }).then(setAlbum).catch(error => { if (!controller.signal.aborted) setError(error.message) })
    return () => controller.abort()
  }, [id, user, retry])
  const run = async (work: () => Promise<void>) => {
    if (working.current) return
    working.current = true; setBusy(true)
    try { await work() } catch (error) { message.error(error instanceof Error ? error.message : '操作失败') } finally { working.current = false; setBusy(false) }
  }
  const patch = async (data: object) => { if (album) setAlbum(await apiFetch(`/albums/${id}/`, { method: 'PATCH', data: { ...data, version: album.version }, schema: AlbumSchema })) }
  const upload = useCallback(async (files: File[]) => {
    if (!album || !editable || working.current || !files.length) return
    if (files.length + album.count > 500) { message.error('每本画册最多 500 张图片'); return }
    working.current = true; setBusy(true)
    let added = 0
    try {
      for (const raw of files) {
        const photo = await uploadAlbumPhoto(raw, text => message.info(text))
        setAlbum(await addPhotos(id, [{ type: 'photo', id: photo.id }])); added++
      }
      message.success(`已添加 ${added} 张图片`)
    } catch (error) { message.error(`${added ? `已添加 ${added} 张。` : ''}${error instanceof Error ? error.message : '上传失败'}`) }
    finally { working.current = false; setBusy(false) }
  }, [album, editable, id, message])
  useImagePaste(editable && !busy && !edit && !picker && !share, upload)
  const add = async (sources: PhotoSource[]) => { setAlbum(await addPhotos(id, sources)) }
  const reorder = (from: string, to: string) => {
    if (!album || from === to) return
    const order = album.photos.map(photo => photo.id), start = order.indexOf(from), end = order.indexOf(to)
    if (start < 0 || end < 0) return
    order.splice(start, 1); order.splice(end, 0, from)
    void run(() => patch({ order }))
  }
  if (error) return <div className={styles.page}><Alert type="error" message={error} action={<Button onClick={() => setRetry(n => n + 1)}>重试</Button>} /><div className={styles.actions}><Link href="/albums">返回画册</Link>{!user && <Button onClick={showLogin}>登录后查看</Button>}</div></div>
  if (!album) return <div className={styles.page}><Spin /></div>
  return <div className={styles.page}>
    <Link href="/albums">返回画册</Link>
    <header className={styles.header} style={{ marginTop: 20 }}><div><h1>{album.title}</h1><p>{album.description}</p><p className={styles.hint}>{album.count} 张照片 · {album.visibility === 'private' ? '仅自己可见' : '公开画册'}</p></div>
      <div className={styles.actions}>
        {editable && <><Button type="primary" icon={<PlusOutlined />} loading={busy} onClick={() => input.current?.click()}>上传照片</Button><Button disabled={busy} onClick={() => setPicker(true)}>从站内选图</Button><Dropdown menu={{ items: [{ key: 'edit', label: '编辑画册' }, { key: 'delete', label: '删除画册', danger: true }], onClick: ({ key }) => {
          if (key === 'edit') setEdit(true)
          else modal.confirm({ title: '删除这本画册？', content: '源图片和其它画册中的照片会保留。', okText: '删除', cancelText: '取消', okButtonProps: { danger: true }, onOk: async () => { await apiFetch(`/albums/${id}/`, { method: 'DELETE' }); router.replace('/albums') } })
        } }}><Button disabled={busy} icon={<MoreOutlined />} aria-label="管理画册" /></Dropdown></>}
        {album.visibility === 'public' && <Button onClick={() => setShare(true)}>分享画册</Button>}
      </div>
    </header>
    {editable && <p className={styles.hint}>支持粘贴上传。按住排序手柄 200ms 后拖动；右下角可独立设置图片的公开或隐藏。</p>}
    <input ref={input} style={{ display: 'none' }} type="file" accept={IMAGE_UPLOAD_ACCEPT} multiple hidden onChange={event => { void upload(Array.from(event.target.files || [])); event.target.value = '' }} />
    {!album.photos.length ? <div className={styles.empty}><Empty description={editable ? '上传照片，或从动态、生图结果中选图' : '画册还没有照片'} /></div> : <Image.PreviewGroup><PhotoSort ids={album.photos.map(p => p.id)} disabled={!editable || busy} onMove={(from, to) => reorder(album.photos[from].id, album.photos[to].id)} preview={id => {
      const photo = album.photos.find(p => p.id === id)
      // eslint-disable-next-line @next/next/no-img-element
      return photo ? <img src={photoUrl(photo)} alt="拖动中的照片" /> : null
    }}><div className={styles.photos}>
      {album.photos.map((photo, index) => <SortablePhoto className={styles.photo} key={photo.id} id={photo.id} disabled={!editable || busy}>{({ attributes, listeners, setActivatorNodeRef }) => <>
        <div className={styles.photoVisual}><Image src={photoUrl(photo)} alt={photo.name} loading="lazy" />
          {editable && <PhotoVisibilityButton isPublic={photo.isPublic} disabled={busy} onChange={isPublic => void run(async () => { setAlbum(await apiFetch(`/albums/${id}/photos/${photo.id}/`, { method: 'PATCH', data: { isPublic }, schema: AlbumSchema })) })} />}
        </div>
        <div className={styles.photoFooter}>
          {editable ? <Button ref={setActivatorNodeRef} {...attributes} {...listeners} className={styles.drag} type="text" disabled={busy} icon={<HolderOutlined />} aria-label={`排序第 ${index + 1} 张照片`} onContextMenu={event => event.preventDefault()} /> : <span className={styles.hint}>{index + 1}</span>}
          {album.cover?.id === photo.id && <Tag>封面</Tag>}
          <Dropdown trigger={['click']} menu={{ items: [{ key: 'download', label: device === 'desktop' ? '下载图片' : '保存图片' }, ...(editable ? [{ key: 'cover', label: '设为封面' }, { key: 'remove', label: '移出画册', danger: true, icon: <DeleteOutlined /> }] : [])], onClick: ({ key }) => {
            if (key === 'download') void run(() => downloadBlob(photoUrl(photo), /\.[a-z0-9]+$/i.test(photo.name) ? photo.name : `${photo.name}.jpg`, false, device !== 'desktop'))
            if (key === 'cover') void run(() => patch({ coverId: photo.id }))
            if (key === 'remove') void run(async () => { setAlbum(await apiFetch(`/albums/${id}/photos/${photo.id}/`, { method: 'DELETE', schema: AlbumSchema })) })
          } }}><Button type="text" icon={<MoreOutlined />} disabled={busy} aria-label={`第 ${index + 1} 张照片操作`} /></Dropdown>
        </div>
      </>}</SortablePhoto>)}
    </div></PhotoSort></Image.PreviewGroup>}
    {edit && <AlbumForm album={album} onClose={() => setEdit(false)} onSaved={value => { setAlbum(value); setEdit(false); message.success('画册已保存') }} />}
    {picker && <PhotoPicker onClose={() => setPicker(false)} onAdd={add} />}
    <ShareDialog title={album.title} path={share && album.visibility === 'public' ? `/albums/${id}` : null} onClose={() => setShare(false)} description={album.description} />
  </div>
}
