import { getLinkList } from '@/lib/api/links'
import LinkPageClient from './LinkPageClient'

export const dynamic = 'force-dynamic'

export default async function LinkPage() {
  const { list } = await getLinkList(true)
  return <LinkPageClient initial={list} />
}
