import type { Metadata } from 'next'
import { getLifeMomentGroups } from '@/lib/api/life-moments'
import MomentsTimeline from '@/components/home/MomentsTimeline'
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
  return (
    <section className={styles.archive}>
      <header className={styles.archiveHeading}><div><h1>生活片段</h1><p>日常和旅途中的风景。</p></div></header>
      <MomentsTimeline key={page} initial={data} />
    </section>
  )
}
