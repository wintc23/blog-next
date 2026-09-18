'use client'
import { useEffect, useState } from 'react'
import { Spin } from 'antd'
import Link from 'next/link'
import { getImageShare, type ImageShare } from '@/lib/api/image-shares'
import { DownloadImageButton, ResultImage } from './Shared'
import styles from './Tools.module.css'
export default function ResultShare({ token, initialData = null }: { token: string; initialData?: ImageShare | null }) {
  const [data, setData] = useState<ImageShare | null>(initialData), [error, setError] = useState('')
  useEffect(() => { const controller = new AbortController(); const read = () => void getImageShare(token, controller.signal).then(value => { setData(value); setError('') }).catch(error => { if (!controller.signal.aborted) setError(error.message) }); if (!initialData) read(); const timer = setInterval(read, 60000); return () => { controller.abort(); clearInterval(timer) } }, [token, initialData])
  return <div className={styles.shell}>{error ? <div role="alert" className={styles.error}>{error}</div> : !data ? <Spin /> : <><div className={styles.hero}><h1>{data.name} · 创作分享</h1><Link href={`/tools/${data.toolSlug}`}>我也来试试</Link></div><div className={styles.sharedResults}>{data.outputs.map((asset, index) => <article className={styles.panel} key={asset.id}>
    <ResultImage asset={asset} gallery={data.outputs} alt={`分享的生成图片 ${index + 1}`} /><div className={styles.resultCaption}><span>结果 {index + 1}</span><span>{asset.width} × {asset.height}</span></div><div className={styles.resultToolbar}><DownloadImageButton asset={asset} /></div></article>)}</div></>}</div>
}
