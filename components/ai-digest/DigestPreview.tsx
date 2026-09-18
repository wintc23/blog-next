'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Alert, Button, Spin } from 'antd'
import { ClockCircleOutlined } from '@ant-design/icons'
import { apiFetch } from '@/lib/api/client'
import { aiDigestListSchema, aiDigestDetailSchema, type AiDigest, type AiDigestDetail } from '@/lib/schemas/ai-digest'
import styles from './DigestPreview.module.css'
import DigestArticle from './DigestArticle'
import { formatTime, statusText, IssueDate } from './DigestShared'

export default function DigestPreview({ id }: { id?: number }) {
  const [issues, setIssues] = useState<AiDigest[]>([])
  const [settings, setSettings] = useState<{ title: string; timezone: string; publishTime: string } | null>(null)
  const [detail, setDetail] = useState<AiDigestDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    const load = async () => {
      try {
        if (id) {
          setDetail(await apiFetch(`/ai-digests/${id}/`, { schema: aiDigestDetailSchema, signal: controller.signal, cache: 'no-store' }))
        } else {
          const result = await apiFetch('/ai-digests/', { params: { manage: 1, per_page: 30 }, schema: aiDigestListSchema, signal: controller.signal, cache: 'no-store' })
          setIssues(result.list)
          setSettings(result.settings)
        }
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : '加载失败')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [id, attempt])

  if (loading) return <div className={styles.feedback}><Spin /><p>正在读取动态…</p></div>
  if (error) return <div className={styles.feedback}><Alert type="error" message="动态加载失败" description={error} /><Button onClick={() => setAttempt((value) => value + 1)}>重试</Button></div>

  if (!id) {
    const [latest, ...archive] = issues
    return (
      <div className={styles.surface}>
        <main className={styles.index}>
          <header className={styles.indexHeader}>
            <div>
              <p className={styles.eyebrow}><span aria-hidden="true" /> AI NEWS</p>
              <h1>{settings?.title || 'AI 行业动态'}<span className={styles.titleDot}>.</span></h1>
              <p className={styles.tagline}>每天一篇，记录值得关注的 AI 进展。</p>
            </div>
            <div className={styles.headerAside}>
              {settings && <div className={styles.schedule}><ClockCircleOutlined /><strong>{settings.publishTime}</strong><span>{settings.timezone === 'Asia/Shanghai' ? '北京时间' : settings.timezone}</span></div>}
              <span className={styles.privateNote}>草稿仅管理员可见</span>
            </div>
          </header>
          {!latest ? <p className={styles.empty}>还没有动态。</p> : <>
            <section className={styles.feature} aria-labelledby="latest-issue-title">
              <div className={styles.featureCopy}>
                <div className={styles.featureMeta}><span className={styles.latestLabel}>最新一期</span><time dateTime={latest.scheduledPublishAt}>{latest.issueDate.replaceAll('-', '.')}</time><span className={styles.status}>{statusText[latest.status]}</span></div>
                <h2 id="latest-issue-title"><Link href={`/manage/ai-digest/${latest.id}`}>{latest.title}</Link></h2>
                <p>{latest.summary}</p>
                <Link href={`/manage/ai-digest/${latest.id}`} className={styles.primaryLink}>阅读本期</Link>
              </div>
              <Link href={`/manage/ai-digest/${latest.id}`} className={styles.featureVisual} aria-label={`阅读本期：${latest.title}`}>
                <div className={styles.visualTopline}><span>本期主题</span><span>{latest.issueDate.replaceAll('-', ' / ')}</span></div>
                {latest.cover && <img src={latest.cover.url} alt="" width={latest.cover.width || 1200} height={latest.cover.height || 420} fetchPriority="high" />}
                <div className={styles.visualBottomline}><span>AI NEWS</span></div>
              </Link>
            </section>
            {archive.length > 0 && <section className={styles.archive} aria-labelledby="archive-heading">
              <div className={styles.archiveHeader}><h2 id="archive-heading">往期动态 <span>ARCHIVE</span></h2><span>{archive.length} 篇</span></div>
              <div className={styles.archiveList}>
                {archive.map((issue) => <Link key={issue.id} href={`/manage/ai-digest/${issue.id}`} className={styles.archiveRow}>
                  <IssueDate value={issue.issueDate} />
                  <div className={styles.archiveCopy}>
                    <div className={styles.meta}><time dateTime={issue.scheduledPublishAt}>{formatTime(issue.scheduledPublishAt)}</time><span className={styles.status}>{statusText[issue.status]}</span></div>
                    <h3>{issue.title}</h3><p>{issue.summary}</p>
                  </div>
                  {issue.cover && <img className={styles.archiveImage} src={issue.cover.url} alt="" width={1200} height={420} loading="lazy" />}
                </Link>)}
              </div>
            </section>}
          </>}
        </main>
      </div>
    )
  }
  return detail ? <DigestArticle detail={detail} manage /> : null
}
