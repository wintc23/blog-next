import type { Metadata } from 'next'
import { getPosts } from '@/lib/api/posts'
import PostList from '@/components/PostList'
import SiteSearch from '@/components/layout/SiteSearch'
import { getSiteIdentity } from '@/lib/get-site-identity'
import { shareMetadata } from '@/lib/share-metadata'

export async function generateMetadata(): Promise<Metadata> {
  const identity = await getSiteIdentity()
  return shareMetadata({ title: '已归档博客', description: '技术博客已停止更新，过往的技术笔记与开发实践保留归档。', path: '/article', siteName: identity.title })
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
          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <h1 className="m-0 text-2xl font-semibold">已归档博客</h1>
            <div className="w-full sm:w-60"><SiteSearch /></div>
          </div>
          <p className="m-0 max-w-3xl text-sm leading-7 text-[var(--site-text-secondary)]">随着 AI 时代的到来，技术知识的获取方式发生了变化，个人技术博客的影响力也日渐有限。这里将不再更新技术文章，过往内容保留归档，留作学习与实践的记录。</p>
        </header>
      }
    />
  )
}
