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
    const title = `${post.title} - ${SITE.title}`
    const description =
      (post.description || post.abstract || '').trim() || SITE.description
    // og:image has to be an absolute URL for WeChat / QQ / Weibo to
    // pick it up — fall back to the site icon if the post has no
    // cover. `SITE.url` is the canonical origin defined in config.
    const image = post.abstractImage || SITE.icon
    const url = `${SITE.url}/article/${id}`
    return {
      title,
      keywords: post.keywords || SITE.keywords,
      description,
      alternates: { canonical: url },
      openGraph: {
        type: 'article',
        title,
        description,
        url,
        siteName: SITE.title,
        images: [{ url: image }],
        locale: 'zh_CN',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [image],
      },
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
