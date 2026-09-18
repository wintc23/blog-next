import { cache } from 'react'
import type { Metadata } from 'next'
import ResultShare from '@/components/image-tools/ResultShare'
import { getImageShare } from '@/lib/api/image-shares'
import { getSiteIdentity } from '@/lib/get-site-identity'
import { shareMetadata } from '@/lib/share-metadata'

export const dynamic = 'force-dynamic'
type Props = { params: Promise<{ token: string }> }
const loadShare = cache((token: string) => getImageShare(token).catch(() => null))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const [data, identity] = await Promise.all([loadShare(token), getSiteIdentity()])
  const cover = data?.outputs[0]
  return {
    ...shareMetadata({
      title: data ? `${data.name} · 创作分享` : '图片创作分享',
      description: data ? `${data.name}生成的 ${data.outputs.length} 张图片，点击查看完整作品。` : '查看分享的图片作品。',
      path: `/tools/share/${encodeURIComponent(token)}`, siteName: identity.title,
      // Only use the public share's signed outputs, never a task's private inputs.
      image: cover ? { url: `/tools/share/${encodeURIComponent(token)}/cover`, width: cover.width, height: cover.height, alt: `${data!.name}生成的图片` } : undefined,
    }),
    robots: { index: false, follow: false }, referrer: 'no-referrer',
  }
}

export default async function Page({ params }: Props) {
  const { token } = await params
  return <ResultShare key={token} token={token} initialData={await loadShare(token)} />
}
