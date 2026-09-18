import { createHash, randomBytes } from 'node:crypto'
import { SITE } from './config'

type Ticket = { value: string; expiresAt: number }
let cachedTicket: Ticket | undefined
let pendingTicket: Promise<string> | undefined
let credentialKey = ''
let retryAfter = 0

/** Keep the original URL encoding: WeChat signs the full URL without its hash. */
export function wechatShareUrl(value: string) {
  if (value.length > 4096) throw new Error('Invalid share URL')
  const url = new URL(value)
  if (url.origin !== new URL(SITE.url).origin || url.username || url.password) throw new Error('Invalid share URL')
  return value.split('#')[0]
}

export function wechatSignature(ticket: string, nonce: string, timestamp: number, url: string) {
  return createHash('sha1').update(`jsapi_ticket=${ticket}&noncestr=${nonce}&timestamp=${timestamp}&url=${url}`).digest('hex')
}

async function wechatJson(url: URL) {
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(8000) })
  if (!response.ok) throw new Error('WeChat is unavailable')
  const data = await response.json()
  if (data.errcode) throw new Error('WeChat rejected the configuration')
  return data
}

async function loadTicket(appId: string, secret: string) {
  // These credentials and the resulting ticket never leave the server.
  const tokenUrl = new URL('https://api.weixin.qq.com/cgi-bin/token')
  tokenUrl.search = new URLSearchParams({ grant_type: 'client_credential', appid: appId, secret }).toString()
  const token = await wechatJson(tokenUrl)
  if (!token.access_token) throw new Error('Missing WeChat access token')
  const ticketUrl = new URL('https://api.weixin.qq.com/cgi-bin/ticket/getticket')
  ticketUrl.search = new URLSearchParams({ access_token: token.access_token, type: 'jsapi' }).toString()
  const ticket = await wechatJson(ticketUrl)
  if (!ticket.ticket || !Number.isFinite(ticket.expires_in) || ticket.expires_in <= 120) throw new Error('Invalid WeChat ticket')
  cachedTicket = { value: ticket.ticket, expiresAt: Date.now() + (ticket.expires_in - 120) * 1000 }
  return ticket.ticket as string
}

export async function getWechatShareConfig(value: string) {
  const url = wechatShareUrl(value)
  const appId = process.env.WECHAT_APP_ID?.trim()
  const secret = process.env.WECHAT_APP_SECRET?.trim()
  if (!appId || !secret) return null
  const key = createHash('sha256').update(`${appId}:${secret}`).digest('hex')
  if (key !== credentialKey) {
    cachedTicket = undefined
    pendingTicket = undefined
    retryAfter = 0
    credentialKey = key
  }
  let ticket = cachedTicket && cachedTicket.expiresAt > Date.now() ? cachedTicket.value : undefined
  if (!ticket) {
    if (Date.now() < retryAfter) throw new Error('WeChat configuration is temporarily unavailable')
    pendingTicket ||= loadTicket(appId, secret).catch(() => {
      retryAfter = Date.now() + 10000
      throw new Error('WeChat configuration is temporarily unavailable')
    }).finally(() => { pendingTicket = undefined })
    ticket = await pendingTicket
  }
  const nonceStr = randomBytes(16).toString('hex')
  const timestamp = Math.floor(Date.now() / 1000)
  return { appId, nonceStr, timestamp, signature: wechatSignature(ticket, nonceStr, timestamp, url) }
}
