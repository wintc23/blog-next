import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAiNews } from '@/lib/api/ai-news'
import { IssueDate } from '@/components/ai-digest/DigestShared'
import { SITE } from '@/lib/config'
import { formatCount } from '@/lib/utils'
import styles from '@/components/ai-digest/DigestPreview.module.css'

export const dynamic = 'force-dynamic'
export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getAiNews()
  return {
    title: `${settings?.title || 'AI 行业动态'} - ${SITE.title}`,
    description: 'AI 产品、模型与开发工具的图文动态。',
  }
}

export default async function AiNewsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams
  const page = Number(params.page || 1)
  if (!Number.isSafeInteger(page) || page < 1) notFound()
  const data = await getAiNews(page)
  const pages = Math.max(1, Math.ceil(data.total / data.perPage))
  if (page > pages) notFound()
  return <div className={`${styles.index} ${styles.surface}`}>
    <nav className={styles.readerNav}><Link href="/">← 返回首页</Link><span>{data.total} 篇动态</span></nav>
    <header className={styles.publicArchiveHeader}><p className={styles.eyebrow}><span aria-hidden="true" /> AI NEWS</p><h1>{data.settings?.title || 'AI 行业动态'}</h1><p>历史动态</p></header>
    <div className={styles.archiveList}>
      {data.list.map((issue) => <Link key={issue.id} href={`/ai-news/${issue.id}`} className={styles.archiveRow}>
        <IssueDate value={issue.issueDate} />
        <div className={styles.archiveCopy}><div className={styles.meta}><time dateTime={issue.issueDate}>{issue.issueDate}</time><span>{formatCount(issue.readTimes)} 次阅读</span></div><h2>{issue.title}</h2><p>{issue.summary}</p></div>
        {issue.cover && <img className={styles.archiveImage} src={issue.cover.url} alt="" width={1200} height={420} loading="lazy" />}
        <span className={styles.rowArrow} aria-hidden="true">→</span>
      </Link>)}
      {!data.list.length && <p className={styles.empty}>还没有已发布的动态。</p>}
    </div>
    {pages > 1 && <nav className={styles.pagination} aria-label="历史动态分页">
      {page > 1 ? <Link href={`/ai-news?page=${page - 1}`} rel="prev">← 上一页</Link> : <span />}
      <span>第 {page} / {pages} 页</span>
      {page < pages ? <Link href={`/ai-news?page=${page + 1}`} rel="next">下一页 →</Link> : <span />}
    </nav>}
  </div>
}
