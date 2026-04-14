import { getPosts } from '@/lib/api/posts'
import PostList from '@/components/PostList'
import type { Metadata } from 'next'
import { SITE } from '@/lib/config'

export const metadata: Metadata = {
  title: `${SITE.title} - ${SITE.slogon}`,
  description: SITE.description,
}

export const dynamic = 'force-dynamic'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = Number(params.page || 1)
  const data = await getPosts({ page }, true)
  return (
    <PostList
      list={data.list}
      total={data.total}
      page={data.page}
      perPage={data.perPage}
      basePath="/"
    />
  )
}
