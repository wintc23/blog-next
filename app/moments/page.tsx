import type { Metadata } from 'next'
import Link from 'next/link'
import BackLink from '@/components/BackLink'
import { getLifeMomentGroups } from '@/lib/api/life-moments'
import MomentCard from '@/components/home/MomentCard'
import styles from '@/components/home/LifeMoments.module.css'
import { getSiteIdentity } from '@/lib/get-site-identity'
import { shareMetadata } from '@/lib/share-metadata'

export async function generateMetadata(): Promise<Metadata> {
  const identity = await getSiteIdentity()
  return shareMetadata({ title: '生活片段', description: '日常、爬山、徒步与旅行中的记录。', path: '/moments', siteName: identity.title })
}
export const dynamic = 'force-dynamic'

export default async function MomentsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const requestedPage = Number((await searchParams).page || 1)
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const data = await getLifeMomentGroups(page)
  const totalPages = Math.ceil(data.totalDates / data.perPage)
  return (
    <section className={styles.archive}>
      <div className="mb-4"><BackLink href="/">返回首页</BackLink></div>
      <header className={styles.archiveHeading}><div><h1>生活片段</h1><p>日常和旅途中的风景。</p></div></header>
      <div className={styles.timeline}>{data.groups.map((group) => <section key={group.date} className={styles.dateGroup} aria-labelledby={`date-${group.date}`}>
        <h2 id={`date-${group.date}`}><time dateTime={group.date}>{group.date.replaceAll('-', '.')}</time><span>{group.moments.length} 条动态</span></h2>
        <ol>{group.moments.map((moment) => <li key={moment.id}><MomentCard moment={moment} grouped /></li>)}</ol>
      </section>)}</div>
      {totalPages > 1 && <nav className={styles.pagination} aria-label="动态分页">
        {data.page > 1 ? <Link href={`/moments?page=${data.page - 1}`}>上一页</Link> : <span />}
        <span aria-current="page">第 {data.page} / {totalPages} 页</span>
        {data.page < totalPages ? <Link href={`/moments?page=${data.page + 1}`}>下一页</Link> : <span />}
      </nav>}
    </section>
  )
}
