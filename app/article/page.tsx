import type { Metadata } from 'next'
import { getPosts } from '@/lib/api/posts'
import PostList from '@/components/PostList'

export const metadata: Metadata = {
  title: '博客归档',
  description: '过往的技术笔记与开发实践。',
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
      header={
        <header className="sub-page-header">
          <h1 className="mb-2 mt-0 text-2xl font-semibold">博客归档</h1>
          <p className="m-0 text-sm leading-6 text-[#777]">过往的技术笔记与开发实践。</p>
        </header>
      }
    />
  )
}
