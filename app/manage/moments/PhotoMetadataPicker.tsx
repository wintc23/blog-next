'use client'
import { useRef, useState } from 'react'
import { App, Alert, Button, Checkbox, Modal, Radio } from 'antd'
import { CalendarOutlined } from '@ant-design/icons'
import type { MomentImage } from '@/lib/schemas/personal-profile'
import { readPhotoMetadata, type PhotoMetadata } from '@/lib/photo-metadata'
import { IMAGE_UPLOAD_ACCEPT } from '@/lib/image-formats'
import styles from './MomentsManager.module.css'
export default function PhotoMetadataPicker({ images, metadata, disabled, onApply }: {
  images: MomentImage[]; metadata: Record<string, PhotoMetadata>; disabled?: boolean; onApply: (value: PhotoMetadata) => void
}) {
  const { message } = App.useApp()
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [selected, setSelected] = useState('')
  const [fields, setFields] = useState<string[]>([]), [original, setOriginal] = useState<{ name: string; data: PhotoMetadata } | null>(null)
  const input = useRef<HTMLInputElement>(null), generation = useRef(0)
  const choices = images.map((image, index) => ({ key: image.url, name: `照片 ${index + 1}`, url: image.url, data: metadata[image.url] || {} }))
  if (original) choices.push({ key: 'original', name: original.name, url: '', data: original.data })
  const current = choices.find(choice => choice.key === selected)?.data
  const choose = (key: string, data?: PhotoMetadata) => {
    setSelected(key); const value = data || choices.find(choice => choice.key === key)?.data
    setFields([...(value?.takenAt ? ['time'] : []), ...(value?.location ? ['location'] : [])])
  }
  const close = () => { generation.current++; setOpen(false); setBusy(false) }
  return <>
    <div className={styles.metadataShortcuts}>{choices.filter(choice => choice.url && (choice.data.takenAt || choice.data.location)).map(choice => <span key={choice.key}>
      {choice.data.takenAt && <Button disabled={disabled} title={choice.data.timeNote} onClick={() => onApply({ takenAt: choice.data.takenAt, timeNote: choice.data.timeNote })}>
        {/* eslint-disable-next-line @next/next/no-img-element */}<img src={choice.url} alt={choice.name} />{choice.data.takenAt.replace('T', ' ')}
      </Button>}
      {choice.data.location && <Button disabled={disabled} title={choice.data.location} onClick={() => onApply({ location: choice.data.location })}>
        {/* eslint-disable-next-line @next/next/no-img-element */}<img src={choice.url} alt={choice.name} />{choice.data.location}
      </Button>}
    </span>)}</div>
    <Button type="link" icon={<CalendarOutlined />} disabled={disabled} onClick={() => { setOpen(true); const choice = choices.find(choice => choice.data.takenAt || choice.data.location) || choices[0]; choose(choice?.key || '') }}>从照片填入日期、地点</Button>
    <Modal open={open} title="从照片填入" onCancel={close} okText="填入所选信息" cancelText="取消" okButtonProps={{ disabled: busy || !fields.length || !current }} onOk={() => {
      if (!current) return
      onApply({ ...(fields.includes('time') ? { takenAt: current.takenAt, timeNote: current.timeNote } : {}), ...(fields.includes('location') ? { location: current.location } : {}) }); close()
    }}>
      <p className={styles.photoHint}>选择一张照片，再确认要填入的信息。填入后仍可修改。</p>
      {!!choices.length && <Radio.Group className={styles.metadataChoices} value={selected} onChange={event => choose(event.target.value)}>{choices.map(choice => <Radio value={choice.key} key={choice.key}>
        {choice.url && /* eslint-disable-next-line @next/next/no-img-element */ <img src={choice.url} alt="" />}<span>{choice.name}</span>
      </Radio>)}</Radio.Group>}
      <div className={styles.metadataFields}>
        {current?.takenAt && <Checkbox checked={fields.includes('time')} onChange={event => setFields(values => event.target.checked ? [...values, 'time'] : values.filter(value => value !== 'time'))}>拍摄时间：{current.takenAt.replace('T', ' ')}</Checkbox>}
        {current?.takenAt && <p className={styles.photoHint}>{current.timeNote}</p>}
        {current?.location && <Checkbox checked={fields.includes('location')} onChange={event => setFields(values => event.target.checked ? [...values, 'location'] : values.filter(value => value !== 'location'))}>地点：{current.location}</Checkbox>}
        {current?.latitude !== undefined && <p className={styles.photoHint}>GPS 记录的是坐标，可在地点框修改为景点或地名。</p>}
        {current && (!current.takenAt || !current.location) && <Alert type="info" message={!current.takenAt && !current.location ? '这张照片没有可读取的拍摄时间或地点' : !current.takenAt ? '照片没有记录拍摄时间' : '照片没有记录地点'} />}
      </div>
      <Button loading={busy} onClick={() => input.current?.click()}>选择本地原图读取</Button>
      <input ref={input} type="file" accept={IMAGE_UPLOAD_ACCEPT} style={{ display: 'none' }} onChange={async event => {
        const file = event.target.files?.[0]; event.target.value = ''; if (!file) return
        const attempt = ++generation.current; setBusy(true)
        try { const data = await readPhotoMetadata(file); if (attempt !== generation.current) return; setOriginal({ name: file.name, data }); choose('original', data) }
        catch { message.error('无法读取照片信息') }
        finally { if (attempt === generation.current) setBusy(false) }
      }} />
      <p className={styles.photoHint}>历史照片、截图或转发图片可能不含拍摄信息，可选择原图重新读取。此操作只在本机读取，不会上传原图。</p>
    </Modal>
  </>
}
