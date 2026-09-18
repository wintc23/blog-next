import { getImageShare } from '@/lib/api/image-shares'
import { ApiError } from '@/lib/api/client'
import { INTERNAL_API_BASE_URL } from '@/lib/config'

export const dynamic = 'force-dynamic'

/** A stable cover URL that keeps the public share's expiration and revocation checks. */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  try {
    const share = await getImageShare((await params).token)
    const cover = share.outputs[0]
    if (!cover || !/^\/image-assets\/[a-zA-Z0-9-]+\/\?ticket=/.test(cover.url)) return new Response(null, { status: 404, headers })
    const response = await fetch(`${INTERNAL_API_BASE_URL}${cover.url}&resolve=1`, { cache: 'no-store', signal: AbortSignal.timeout(10000) })
    if (!response.ok) return new Response(null, { status: response.status === 403 || response.status === 404 ? 404 : 502, headers })
    const { url } = await response.json() as { url: string }
    if (!/^https:\/\/s3\.[a-z0-9-]+\.qiniucs\.com\//.test(url)) return new Response(null, { status: 502, headers })
    return new Response(null, { status: 302, headers: { ...headers, Location: url } })
  } catch (error) {
    return new Response(null, { status: error instanceof ApiError && error.status === 404 ? 404 : 503, headers })
  }
}
