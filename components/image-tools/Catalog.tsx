'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button, Spin } from 'antd'
import { apiFetch } from '@/lib/api/client'
import { ToolsResult, toolCover, type Tool } from '@/lib/image-tools'
import styles from './Tools.module.css'
import entryStyles from './ToolEntry.module.css'

export default function Catalog({ compact = false, column = false, initialTools }: { compact?: boolean; column?: boolean; initialTools?: Tool[] }) {
  const [tools, setTools] = useState<Tool[]>(initialTools || [])
  const [loading, setLoading] = useState(initialTools === undefined)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  useEffect(() => {
    if (initialTools !== undefined && reload === 0) return
    const controller = new AbortController()
    setLoading(true); setError('')
    apiFetch('/image-tools/', { schema: ToolsResult, signal: controller.signal }).then(value => setTools(value.tools))
      .catch(error => { if (!controller.signal.aborted) setError(error.message || '工具加载失败') }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [reload, initialTools])
  const Heading = compact || column ? 'h3' : 'h2'
  return <section className={column ? entryStyles.column : styles.shell}>
    {column ? <><div className={entryStyles.heading}><h2>图片工具</h2><Link href="/products">全部工具</Link></div><p className={entryStyles.introduction}>给照片换个画风，让旧时光更清晰。</p></> : !compact ? <><div className={styles.topline}><Link href="/products">← 返回探索</Link><Link href="/tools/tasks">我的图片任务</Link></div>
      <div className={styles.hero}><h1>图片工具</h1><p>给照片换一种画风，修复旧时光，或从一句描述开始创作。手机上传，电脑继续，生成后轻松下载。</p></div></> : <div className={styles.topline}><h2 className={styles.catalogHeading}>图片工具</h2><Link href="/tools/tasks">我的图片任务</Link></div>}
    {error && <div role="alert" className={styles.error}>工具暂时无法加载。<Button type="link" onClick={() => setReload(r => r + 1)}>重试</Button></div>}
    {loading ? <div className={column ? entryStyles.loading : undefined}><Spin aria-label="加载图片工具" /></div> : <div className={column ? entryStyles.list : styles.grid}>{(column ? tools.slice(0, 3) : tools).map(tool => <Link className={column ? entryStyles.card : styles.tool} key={tool.slug} href={`/tools/${tool.slug}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={toolCover(tool)} alt="" loading="lazy" className={column ? entryStyles.cover : styles.toolCover} />
      <Heading>{tool.config.name}</Heading><p>{tool.config.description}</p><span className={column ? entryStyles.cta : undefined}>开始使用</span>
    </Link>)}</div>}
    {!loading && !error && !tools.length && <p className={styles.hint}>工具正在准备中，请稍后再来。</p>}
    {column && <div className={entryStyles.footer}><span>手机上传 · 电脑继续</span><Link href="/tools/tasks">我的图片任务</Link></div>}
  </section>
}
