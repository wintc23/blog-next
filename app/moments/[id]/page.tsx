import { cache } from 'react'
import type { Metadata } from 'next'
import BackLink from '@/components/BackLink'
import { notFound } from 'next/navigation'
import { getLifeMoment } from '@/lib/api/life-moments'
import { ApiError } from '@/lib/api/client'
import { getSiteIdentity } from '@/lib/get-site-identity'
import { shareMetadata } from '@/lib/share-metadata'
import DigestComments from '@/components/ai-digest/DigestComments'
import MomentCard from '@/components/home/MomentCard'
import styles from '@/components/home/LifeMoments.module.css'

export const dynamic = 'force-dynamic'
type Props = { params: Promise<{ id: string }> }
const loadMoment = cache(async (id: string) => {
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) notFound()
  try { return await getLifeMoment(id) } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound()
    throw error
  }
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [moment, identity] = await Promise.all([loadMoment((await params).id), getSiteIdentity()])
  const cover = moment.images.find(picture => picture.isPublic !== false)
  return shareMetadata({
    title: `${moment.date.replaceAll('-', '.')} 的生活片段`, description: moment.text.slice(0, 160) || identity.description,
    path: `/moments/${moment.id}`, siteName: identity.title, type: 'article',
    image: cover ? { url: cover.url, alt: cover.description } : undefined,
  })
}

export default async function MomentPage({ params }: Props) {
  const moment = await loadMoment((await params).id)
  return <section className={styles.detail}>
    <div className="mb-4"><BackLink href="/moments">返回动态列表</BackLink></div>
    <header className={styles.archiveHeading}><h1>生活片段</h1></header>
    <MomentCard moment={moment} detail />
    <DigestComments momentId={moment.id} />
  </section>
}
