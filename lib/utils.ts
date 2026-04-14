export function camel<T = unknown>(data: unknown): T {
  if (data === null || data === undefined || typeof data === 'string') return data as T
  if (Array.isArray(data)) return data.map((item) => camel(item)) as T
  if (typeof data === 'object') {
    const out: Record<string, unknown> = {}
    for (const key in data as Record<string, unknown>) {
      const newKey = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
      out[newKey] = camel((data as Record<string, unknown>)[key])
    }
    return out as T
  }
  return data as T
}

export function underline<T = unknown>(data: unknown): T {
  if (data === null || data === undefined || typeof data === 'string') return data as T
  if (Array.isArray(data)) return data.map((item) => underline(item)) as T
  if (typeof data === 'object') {
    const out: Record<string, unknown> = {}
    for (const key in data as Record<string, unknown>) {
      const newKey = key.replace(/([A-Z])/g, (_, c: string) => `_${c.toLowerCase()}`)
      out[newKey] = underline((data as Record<string, unknown>)[key])
    }
    return out as T
  }
  return data as T
}

export function formatTime(timestamp: number, format = 'yyyy-MM-dd HH:mm'): string {
  if (!timestamp) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  const now = new Date()
  const adjusted = timestamp - now.getTimezoneOffset() * 60
  const d = new Date(adjusted * 1000)
  return format
    .replace(/yyyy/g, String(d.getFullYear()))
    .replace(/MM/g, pad(d.getMonth() + 1))
    .replace(/dd/g, pad(d.getDate()))
    .replace(/HH/g, pad(d.getHours()))
    .replace(/mm/g, pad(d.getMinutes()))
    .replace(/ss/g, pad(d.getSeconds()))
}

export function timeShow(timestamp: number): string {
  if (!timestamp) return ''
  const now = new Date()
  const localTimestamp = timestamp - now.getTimezoneOffset() * 60
  const dateMs = localTimestamp * 1000
  const delta = Math.floor((now.getTime() - dateMs) / 1000)
  if (delta < 60) return '刚刚'
  if (delta < 60 * 60) return `${Math.floor(delta / 60)}分钟前`
  if (delta < 24 * 60 * 60) return `${Math.floor(delta / 60 / 60)}小时前`
  if (delta < 3 * 24 * 60 * 60) return `${Math.floor(delta / 60 / 60 / 24)}天前`
  if (new Date(dateMs).getFullYear() === now.getFullYear()) {
    return formatTime(timestamp, 'MM-dd HH:mm')
  }
  return formatTime(timestamp, 'yyyy-MM-dd')
}

export const TAG_LIST = [
  'orange',
  'geekblue',
  'cyan',
  'green',
  'purple',
  'magenta',
  'blue',
  'volcano',
]

export function* pseudoRandom(n: number, x: number) {
  let seed = 99
  for (let i = 0; i < n; i++) {
    const sin = Math.sin(seed++)
    yield Math.floor(Math.abs(sin) * x)
  }
}

export function getVisitorId(): string {
  if (typeof window === 'undefined') return ''
  const key = 'event_stat_visitor_id'
  const len = 32
  let visitorId = localStorage.getItem(key)
  if (!visitorId || visitorId.length !== len) {
    visitorId = crypto.randomUUID().replace(/-/g, '')
    localStorage.setItem(key, visitorId)
  }
  return visitorId
}

const TOKEN_KEY = 'token'

export function getTokenClient(): string {
  if (typeof document === 'undefined') return ''
  const cookies = document.cookie.split('; ')
  for (const c of cookies) {
    const [k, v] = c.split('=')
    if (k === TOKEN_KEY) return v || ''
  }
  return ''
}

export function setTokenClient(token: string) {
  if (typeof document === 'undefined') return
  const d = new Date()
  d.setHours(d.getHours() + 24 * 30)
  document.cookie = `${TOKEN_KEY}=${token};path=/;expires=${d.toUTCString()}`
}

export function clearTokenClient() {
  if (typeof document === 'undefined') return
  document.cookie = `${TOKEN_KEY}=;path=/;expires=${new Date(0).toUTCString()}`
}

export function formatCount(value: number | undefined): string {
  const v = Number(value) || 0
  if (v < 10000) return String(v)
  return `${(v / 10000).toFixed(1).replace(/\.0$/, '')}w`
}
