'use client'
import { useEffect, useState } from 'react'
import { App, Button, Input, Modal, QRCode, Slider } from 'antd'
import { DownloadOutlined, ShareAltOutlined } from '@ant-design/icons'
import { type Asset, assetUrl, downloadBlob, deviceKind, type DeviceKind } from '@/lib/image-tools'
import CommentImagePreview from '@/components/CommentImagePreview'
import { WECHAT_SHARE_EVENT, type WechatShareData } from '@/components/WechatShare'
import { SITE } from '@/lib/config'
import styles from './Tools.module.css'

export function useDevice() {
  const [device, setDevice] = useState<DeviceKind>('other')
  useEffect(() => {
    const query = window.matchMedia('(pointer: fine)')
    const update = () => setDevice(deviceKind(navigator.userAgent, navigator.maxTouchPoints, query.matches))
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return device
}

export function ShareDialog({ title, path, onClose, note, shareTitle = title, description, image }: { title: string; path: string | null; onClose: () => void; note?: string; shareTitle?: string; description?: string; image?: string }) {
  const { message } = App.useApp()
  const [url, setUrl] = useState('')
  useEffect(() => { setUrl(path ? new URL(path, window.location.origin).href : '') }, [path])
  useEffect(() => {
    // In WeChat, the open dialog shares the public result/tool, not the owner's task URL.
    if (!path || !/^\/tools\/(share\/[^/]+|[^/]+)$/.test(path)) return
    const link = new URL(path, window.location.origin).href
    const detail: WechatShareData = { title: shareTitle, desc: description || '', link,
      imgUrl: path.startsWith('/tools/share/') ? `${link}/cover` : new URL(image || SITE.icon, window.location.origin).href }
    window.dispatchEvent(new CustomEvent(WECHAT_SHARE_EVENT, { detail }))
    return () => { window.dispatchEvent(new CustomEvent(WECHAT_SHARE_EVENT, { detail: null })) }
  }, [path, shareTitle, description, image])
  return <Modal open={!!path} title={title} onCancel={onClose} footer={null} destroyOnClose>
    <div className={styles.qr}>{url && <QRCode value={url} size={200} />}<p>{note || '扫码打开，也可以复制链接。'}</p>
      <Input value={url} readOnly aria-label="分享地址" />
      <div className={styles.actions}><Button onClick={async () => { try { await navigator.clipboard.writeText(url); message.success('链接已复制') } catch { message.info('请长按或选中地址复制') } }}>复制链接</Button>
        <Button icon={<ShareAltOutlined />} onClick={async () => { try { if (path && /^\/tools\/(share\/[^/]+|[^/]+)$/.test(path) && /MicroMessenger/i.test(navigator.userAgent)) { message.info('请点击微信右上角菜单，发送给朋友或分享到朋友圈'); return } if (navigator.share) await navigator.share({ title: shareTitle, text: description, url }); else { await navigator.clipboard.writeText([shareTitle, description, url].filter(Boolean).join('\n')); message.success('分享文字和链接已复制') } } catch (error) { if (!(error instanceof Error && error.name === 'AbortError')) message.error('请复制链接分享') } }}>分享</Button></div>
    </div>
  </Modal>
}

export function ResultImage({ asset, alt, compact = false, gallery = [asset] }: { asset: Asset; alt: string; compact?: boolean; gallery?: Asset[] }) {
  const [preview, setPreview] = useState<number | null>(null)
  return <>
    <Button type="text" className={`${styles.imagePreview} ${compact ? styles.compactPreview : ''}`} aria-label={`${alt}，查看大图`} aria-haspopup="dialog" onClick={() => setPreview(Math.max(0, gallery.findIndex(image => image.id === asset.id)))}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={assetUrl(asset)} alt={alt} width={asset.width} height={asset.height} />
    </Button>
    <CommentImagePreview images={gallery.map(image => ({ url: assetUrl(image), alt: image.id === asset.id ? alt : image.name }))} current={preview} onChange={setPreview} />
  </>
}

export function DownloadImageButton({ asset, disabled = false }: { asset: Asset; disabled?: boolean }) {
  const { message } = App.useApp()
  const [busy, setBusy] = useState(false)
  const device = useDevice()
  const download = async (share = false) => {
    setBusy(true)
    try { await downloadBlob(assetUrl(asset), asset.name.replace(/\.[^.]+$/, '') + '.png', false, share) }
    catch (error) { if (!(error instanceof Error && error.name === 'AbortError')) message.error(error instanceof Error ? error.message : '下载失败') }
    finally { setBusy(false) }
  }
  return <Button type="primary" icon={<DownloadOutlined />} loading={busy} disabled={disabled} onClick={() => void download(device !== 'desktop')}>{device === 'desktop' ? '下载图片' : '保存图片'}</Button>
}

export function Compare({ input, output }: { input: Asset; output: Asset }) {
  const [split, setSplit] = useState(50)
  return <div className={styles.compare}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={assetUrl(output)} alt="修复后" />
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={assetUrl(input)} alt="原照片" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }} />
    <div className={styles.compareControl}>原图 ← 滑动对比 → 修复后<Slider min={0} max={100} value={split} onChange={setSplit} ariaLabelForHandle="原图与修复结果对比" /></div>
  </div>
}
