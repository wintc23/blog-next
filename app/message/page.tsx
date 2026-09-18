import { getMessages } from '@/lib/api/messages'
import MessagePageClient from './MessagePageClient'
import { getSiteIdentity } from '@/lib/get-site-identity'
import { shareMetadata } from '@/lib/share-metadata'

export async function generateMetadata() {
  const identity = await getSiteIdentity()
  return shareMetadata({ title: '留言', description: '分享想法，留下你的留言。', path: '/message', siteName: identity.title })
}

export const dynamic = 'force-dynamic'

export default async function MessagePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const sp = await searchParams
  const page = Number(sp.page || 1)
  const data = await getMessages({ page }, true)
  return <MessagePageClient initial={data} />
}
