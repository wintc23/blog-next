import type { ZodTypeAny, z } from 'zod'
import { underline, getTokenClient, clearTokenClient, camel } from '@/lib/utils'
import { BASE_URL } from '@/lib/config'

const isServer = typeof window === 'undefined'

export interface ApiFetchOptions<T extends ZodTypeAny = ZodTypeAny> {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: unknown
  params?: Record<string, unknown>
  token?: string
  cache?: RequestCache
  next?: NextFetchRequestConfig
  headers?: Record<string, string>
  /** Zod schema to validate and type the response body. */
  schema?: T
}

export class ApiError extends Error {
  status: number
  data?: unknown
  constructor(status: number, message: string, data?: unknown) {
    super(message)
    this.status = status
    this.data = data
  }
}

async function runFetch(
  path: string,
  opts: ApiFetchOptions,
  token: string | undefined,
): Promise<unknown> {
  const { method = 'GET', data, params, cache, next, headers: extraHeaders } = opts

  let url = `${BASE_URL}${path}`
  if (params) {
    const qs = new URLSearchParams()
    for (const k in params) {
      const v = params[k]
      if (v !== undefined && v !== null) qs.append(k, String(v))
    }
    const qstr = qs.toString()
    if (qstr) url += (url.includes('?') ? '&' : '?') + qstr
  }

  const headers: Record<string, string> = { ...(extraHeaders || {}) }
  if (token) headers['Authorization'] = token
  let body: string | undefined
  if (data !== undefined && method !== 'GET') {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(underline(data))
  }

  const res = await fetch(url, { method, headers, body, cache, next })
  const text = await res.text()
  let parsed: unknown = null
  if (text) {
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = text
    }
  }

  if (!res.ok) {
    const result = camel(parsed)
    if (!isServer && res.status === 401) clearTokenClient()
    const msg =
      (result && typeof result === 'object' && 'message' in result
        ? String((result as { message?: unknown }).message || '')
        : '') || res.statusText
    throw new ApiError(res.status, msg, result)
  }
  return parsed
}

/**
 * Client/universal fetch. On client it reads token from document.cookie.
 * On server it runs without token unless one is explicitly passed.
 */
export async function apiFetch<T extends ZodTypeAny>(
  path: string,
  opts: ApiFetchOptions<T> & { schema: T },
): Promise<z.infer<T>>
export async function apiFetch(path: string, opts?: ApiFetchOptions): Promise<unknown>
export async function apiFetch<T extends ZodTypeAny>(
  path: string,
  opts: ApiFetchOptions<T> = {},
): Promise<unknown> {
  let token = opts.token
  if (!token && !isServer) token = getTokenClient()
  const raw = await runFetch(path, opts, token)
  if (opts.schema) return opts.schema.parse(camel(raw))
  return camel(raw)
}

/**
 * Server-only fetch: automatically reads the `token` cookie via `next/headers`.
 * Only call from Server Components / Route Handlers / Server Actions.
 */
export async function apiFetchServer<T extends ZodTypeAny>(
  path: string,
  opts: ApiFetchOptions<T> & { schema: T },
): Promise<z.infer<T>>
export async function apiFetchServer(
  path: string,
  opts?: ApiFetchOptions,
): Promise<unknown>
export async function apiFetchServer<T extends ZodTypeAny>(
  path: string,
  opts: ApiFetchOptions<T> = {},
): Promise<unknown> {
  let token = opts.token
  if (!token) {
    try {
      const mod = await import('next/headers')
      const store = await mod.cookies()
      token = store.get('token')?.value
    } catch {
      // outside RSC context
    }
  }
  if (!opts.cache && !opts.next) opts.cache = 'no-store'
  const raw = await runFetch(path, opts, token)
  if (opts.schema) return opts.schema.parse(camel(raw))
  return camel(raw)
}
