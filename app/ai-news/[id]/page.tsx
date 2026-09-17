import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAiNewsDetail } from '@/lib/api/ai-news'
import { ApiError } from '@/lib/api/client'
import DigestArticle from '@/components/ai-digest/DigestArticle'
import { SITE } from '@/lib/config'
import { getSiteIdentity } from '@/lib/get-site-identity'
import { formatSiteTitle } from '@/lib/site-identity'

export const dynamic = 'force-dynamic'
type Props = { params: Promise<{ id: string }> }

async function getPublishedIssue(params: Props['params']) {
  const { id } = await params
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1) notFound()
  try {
    const detail = await getAiNewsDetail(Number(id))
    if (detail.status !== 'published') notFound()
    return detail
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound()
    throw error
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [detail, identity] = await Promise.all([getPublishedIssue(params), getSiteIdentity()])
  const title = `${detail.title.trim()} - ${detail.channelTitle.trim()}`
  return {
    title, description: detail.summary,
    alternates: { canonical: `${SITE.url}/ai-news/${detail.id}` },
    openGraph: { type: 'article', title: formatSiteTitle(title, identity.title), siteName: identity.title, description: detail.summary,
      publishedTime: detail.publishedAt || undefined, modifiedTime: detail.updatedAt,
      images: detail.cover ? [{ url: detail.cover.url, alt: detail.cover.alt }] : [] },
  }
}

export default async function Page({ params }: Props) {
  return <DigestArticle detail={await getPublishedIssue(params)} />
}
