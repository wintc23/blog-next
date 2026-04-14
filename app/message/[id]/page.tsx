import { getMessageDetail } from '@/lib/api/messages'
import MessageDetailClient from './MessageDetailClient'
import { notFound } from 'next/navigation'

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
  return <MessageDetailClient initial={data.list} currentId={id} />
}
