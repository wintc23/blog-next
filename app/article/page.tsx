import type { Metadata } from 'next'
import { getPosts } from '@/lib/api/posts'
import { SITE } from '@/lib/config'
import PostList from '@/components/PostList'

export const metadata: Metadata = {
  title: `博客 - ${SITE.title}`,
  description: '技术笔记与开发实践。',
}

export const dynamic = 'force-dynamic'

export default async function ArticlePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams
  const requestedPage = Number(params.page || 1)
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const data = await getPosts({ page }, true)
  return (
    <PostList
      list={data.list}
      total={data.total}
      page={data.page}
      perPage={data.perPage}
      basePath="/article"
      header={<h1 className="sr-only">博客</h1>}
    />
  )
}
