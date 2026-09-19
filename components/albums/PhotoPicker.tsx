'use client'
import { useEffect, useState } from 'react'
import { Alert, App, Button, Checkbox, Empty, Modal, Pagination, Spin, Tabs } from 'antd'
import { apiFetch } from '@/lib/api/client'
import { SourcesSchema, photoUrl, sourceKey, type AlbumPhoto, type PhotoSource } from '@/lib/albums'
import styles from './Albums.module.css'
export default function PhotoPicker({ onClose, onAdd }: { onClose: () => void; onAdd: (sources: PhotoSource[]) => Promise<void> }) {
  const { message } = App.useApp()
  const [source, setSource] = useState('photo'), [page, setPage] = useState(1), [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<Record<string, PhotoSource>>({})
  const [data, setData] = useState<{ list: (AlbumPhoto & { source: PhotoSource })[]; total: number; perPage: number } | null>(null)
  const [error, setError] = useState(''), [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController(); setData(null); setError('')
    apiFetch('/album-sources/', { params: { source, page }, schema: SourcesSchema, signal: controller.signal }).then(setData).catch(error => { if (!controller.signal.aborted) setError(error.message) })
    return () => controller.abort()
  }, [source, page, retry])
  const toggle = (photo: PhotoSource, checked: boolean) => setSelected(previous => {
    const next = { ...previous }, key = sourceKey(photo)
    if (checked && Object.keys(next).length < 100) next[key] = photo
    else if (!checked) delete next[key]
    return next
  })
  return <Modal open width={720} title="从站内选图" onCancel={onClose} okText={`加入画册（${Object.keys(selected).length}）`} cancelText="取消" confirmLoading={busy} okButtonProps={{ disabled: !Object.keys(selected).length }} onOk={async () => {
    setBusy(true)
    try { await onAdd(Object.values(selected)); onClose() } catch (error) { message.error(error instanceof Error ? error.message : '添加失败') } finally { setBusy(false) }
  }}>
    <Tabs activeKey={source} onChange={key => { setSource(key); setPage(1) }} items={[{ key: 'photo', label: '我的照片' }, { key: 'moment', label: '生活动态' }, { key: 'generated', label: '生图结果' }, { key: 'media', label: '其它上传' }]} />
    {error ? <Alert type="error" message={error} action={<Button onClick={() => setRetry(n => n + 1)}>重试</Button>} /> : !data ? <Spin /> : <>
      {!data.list.length ? <Empty description="这里还没有图片" /> : <div className={styles.picker}>{data.list.map(photo => <div key={sourceKey(photo.source)} className={`${styles.choice} ${selected[sourceKey(photo.source)] ? styles.selected : ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoUrl(photo)} alt={photo.name} loading="lazy" onClick={() => toggle(photo.source, !selected[sourceKey(photo.source)])} />
        <Checkbox checked={!!selected[sourceKey(photo.source)]} aria-label={`选择 ${photo.name}`} onChange={event => toggle(photo.source, event.target.checked)} />
      </div>)}</div>}
      <Pagination current={page} total={data.total} pageSize={data.perPage} onChange={setPage} showSizeChanger={false} hideOnSinglePage />
    </>}
    <p className={styles.hint}>可跨来源选择，最多一次添加 100 张。同一张图片可以加入不同画册。</p>
  </Modal>
}
