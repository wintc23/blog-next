import { getWechatShareConfig, wechatShareUrl } from '@/lib/wechat-share'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'no-store' }

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get('url') || ''
  try { wechatShareUrl(url) } catch {
    return Response.json({ error: 'Invalid share URL' }, { status: 400, headers })
  }
  try {
    const config = await getWechatShareConfig(url)
    return Response.json(config ? { enabled: true, ...config } : { enabled: false }, { headers })
  } catch {
    // Do not expose upstream responses, tokens, or credential-bearing URLs.
    return Response.json({ enabled: false }, { status: 503, headers })
  }
}
