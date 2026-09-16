import type { Metadata } from 'next'
import Link from 'next/link'
import { getLifeMoments } from '@/lib/api/life-moments'
import MomentCard from '@/components/home/MomentCard'
import Pagination from '@/components/Pagination'
import styles from '@/components/home/LifeMoments.module.css'

export const metadata: Metadata = { title: '生活片段', description: '日常、爬山、徒步与旅行中的记录。' }
export const dynamic = 'force-dynamic'

export default async function MomentsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const requestedPage = Number((await searchParams).page || 1)
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const data = await getLifeMoments(page, 9, true)
  return (
    <section className={styles.archive}>
      <header className={styles.archiveHeading}><div><h1>生活片段</h1><p>日常和旅途中的风景。</p></div><Link href="/">返回首页</Link></header>
      <div className={styles.archiveGrid}>{data.list.map((moment) => <MomentCard key={moment.id} moment={moment} />)}</div>
      <Pagination total={data.total} perPage={data.perPage} page={data.page} hrefFor={(p) => `/moments?page=${p}`} />
    </section>
  )
}
