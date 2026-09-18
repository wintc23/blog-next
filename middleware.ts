import { NextResponse, type NextRequest } from 'next/server'

/** The local API proxy must not turn a caller-supplied IP into a trusted IP.
 * Flask groups local proxy traffic by the gateway address when no trusted
 * X-Real-IP is supplied. Production nginx may forward directly with its own IP.
 */
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers)
  headers.delete('x-real-ip')
  headers.delete('x-forwarded-for')
  return NextResponse.next({ request: { headers } })
}

export const config = { matcher: '/api/:path*' }
