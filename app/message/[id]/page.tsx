import { getMessageDetail } from '@/lib/api/messages'
import BackLink from '@/components/BackLink'
import MessageDetailClient from './MessageDetailClient'
import { notFound } from 'next/navigation'
import { getSiteIdentity } from '@/lib/get-site-identity'
import { shareMetadata } from '@/lib/share-metadata'
import { parseRichContent, splitCommentBody } from '@/lib/rich-content'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // Metadata is always anonymous: never include a hidden message visible to an admin.
  const [data, identity] = await Promise.all([getMessageDetail(id).catch(() => null), getSiteIdentity()])
  const message = data?.list.find(item => String(item.id) === id && !item.hide)
  const { text, images } = splitCommentBody(message?.body || '')
  const description = parseRichContent(text).map(part => part.text).join('').trim().slice(0, 160) || '查看留言与讨论。'
  return shareMetadata({ title: '留言详情', description, path: `/message/${encodeURIComponent(id)}`, siteName: identity.title,
    image: images[0] ? { url: images[0].url, alt: images[0].alt } : undefined })
}

export const dynamic = 'force-dynamic'

export default async function MessageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let data
  try {
    data = await getMessageDetail(id, true)
  } catch {
    notFound()
  }
  if (!data) notFound()
  return <><div className="mb-4 px-2"><BackLink href="/message">返回留言列表</BackLink></div><MessageDetailClient initial={data.list} currentId={id} /></>
}
