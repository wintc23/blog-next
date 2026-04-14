import { getAboutMe } from '@/lib/api/posts'
import ArticleContent from '@/components/ArticleContent'

export const dynamic = 'force-dynamic'

export default async function AboutPage() {
  const post = await getAboutMe(true)
  return (
    <div className="ws rounded-sm">
      <div className="p-8 sm:p-12">
        <ArticleContent html={post.bodyHtml || ''} />
      </div>
    </div>
  )
}
