import { getMessages } from '@/lib/api/messages'
import MessagePageClient from './MessagePageClient'

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
