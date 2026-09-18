import ToolScreen from '@/components/image-tools/ToolScreen'
import { apiFetch } from '@/lib/api/client'
import { ToolResult, toolCover } from '@/lib/image-tools'
import { getSiteIdentity } from '@/lib/get-site-identity'
import { shareMetadata } from '@/lib/share-metadata'
export const dynamic = 'force-dynamic'
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  try {
    const [{ tool }, identity] = await Promise.all([apiFetch(`/image-tools/${encodeURIComponent(slug)}/`, { schema: ToolResult }), getSiteIdentity()])
    return shareMetadata({ title: tool.config.name, description: tool.config.description, path: `/tools/${encodeURIComponent(slug)}`, siteName: identity.title, image: { url: toolCover(tool), alt: tool.config.name } })
  }
  catch { return { title: '图片工具' } }
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) { return <ToolScreen slug={(await params).slug} /> }
