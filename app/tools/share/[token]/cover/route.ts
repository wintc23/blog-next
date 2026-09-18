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
    const response = await fetch(`${INTERNAL_API_BASE_URL}${cover.url}`, { cache: 'no-store', signal: AbortSignal.timeout(10000) })
    const contentType = response.headers.get('content-type') || ''
    if (!response.ok || !/^image\/(png|jpeg|webp)(;|$)/.test(contentType)) return new Response(null, { status: response.status === 403 || response.status === 404 ? 404 : 502, headers })
    return new Response(response.body, { headers: { ...headers, 'Content-Type': contentType } })
  } catch (error) {
    return new Response(null, { status: error instanceof ApiError && error.status === 404 ? 404 : 503, headers })
  }
}
