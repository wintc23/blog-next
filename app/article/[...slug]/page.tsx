import { getPost } from '@/lib/api/posts'
import ArticleClient from './ArticleClient'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { SITE } from '@/lib/config'

export const dynamic = 'force-dynamic'

interface Params {
  slug: string[]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { slug } = await params
  const [id, type] = slug
  try {
    const post = await getPost(id, type, true)
    return {
      title: `${post.title} - ${SITE.title}`,
      keywords: post.keywords || SITE.keywords,
      description: (post.description || '') + SITE.description,
    }
  } catch {
    return { title: SITE.title }
  }
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<Params>
}) {
  const { slug } = await params
  if (!slug || !slug.length) notFound()
  const [id, type] = slug
  let post
  try {
    post = await getPost(id, type, true)
  } catch {
    notFound()
  }
  if (!post) notFound()
  return <ArticleClient initialPost={post} />
}
