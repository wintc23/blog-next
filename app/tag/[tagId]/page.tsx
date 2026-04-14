import { getPostsByTag } from '@/lib/api/posts'
import PostList from '@/components/PostList'
import { notFound } from 'next/navigation'
import { getTagList } from '@/lib/api/tags'

export const dynamic = 'force-dynamic'

export default async function TagPage({
  params,
  searchParams,
}: {
  params: Promise<{ tagId: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { tagId } = await params
  const sp = await searchParams
  const page = Number(sp.page || 1)
  const data = await getPostsByTag({ page, tagId: Number(tagId) }, true)
  if (!data.total) notFound()
  const { list: tags } = await getTagList(true).catch(() => ({ list: [] }))
  const tag = tags.find((t) => String(t.id) === tagId)
  return (
    <PostList
      list={data.list}
      total={data.total}
      page={data.page}
      perPage={data.perPage}
      basePath={`/tag/${tagId}`}
      header={
        tag ? (
          <div className="sub-page-header ws">
            当前标签：<span className="text-[#409eff]">{tag.title}</span>，共
            <span className="text-[#409eff]">{tag.postCount}</span>篇文章
          </div>
        ) : undefined
      }
    />
  )
}
