const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const SITE = { url: 'https://wintc.top', icon: 'https://file.wintc.top/logo.jpeg' }
function load(file, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const mod = { exports: {} }
  new Function('require', 'module', 'exports', code)(name => Object.hasOwn(mocks, name) ? mocks[name] : require(name), mod, mod.exports)
  return mod.exports
}
function wechat() { return load('lib/wechat-share.ts', { './config': { SITE } }) }
function credentials(t) {
  const previous = [process.env.WECHAT_APP_ID, process.env.WECHAT_APP_SECRET]
  process.env.WECHAT_APP_ID = 'test-app'
  process.env.WECHAT_APP_SECRET = 'test-secret'
  t.after(() => ['WECHAT_APP_ID', 'WECHAT_APP_SECRET'].forEach((name, index) => {
    if (previous[index] === undefined) delete process.env[name]
    else process.env[name] = previous[index]
  }))
}

test('share metadata uses database site name and absolute cover/canonical URLs', () => {
  const { shareMetadata } = load('lib/share-metadata.ts', {
    './config': { SITE }, './site-identity': { formatSiteTitle: (title, name) => `${title} - ${name}` },
  })
  const meta = shareMetadata({ title: '图片分享', description: '两张创作', path: '/tools/share/test', siteName: '来自数据库的站名', image: { url: '/tools/share/test/cover', width: 1200 } })
  assert.equal(meta.openGraph.title, '图片分享 - 来自数据库的站名')
  assert.equal(meta.openGraph.url, 'https://wintc.top/tools/share/test')
  assert.equal(meta.openGraph.images[0].url, 'https://wintc.top/tools/share/test/cover')
  assert.equal(meta.twitter.images[0], meta.openGraph.images[0].url)
  assert.equal(meta.openGraph.images[0].width, 1200)
  const fallback = shareMetadata({ title: '纯文字内容', description: '介绍', path: '/', siteName: '站名' })
  assert.equal(fallback.openGraph.images[0].url, SITE.icon)
})

test('WeChat signs only the canonical origin and preserves encoding/order without the hash', () => {
  const { wechatShareUrl, wechatSignature } = wechat()
  const url = 'https://wintc.top/article/1?b=%2f&a=2#comments'
  assert.equal(wechatShareUrl(url), 'https://wintc.top/article/1?b=%2f&a=2')
  for (const invalid of ['https://evil.example/', 'https://wintc.top.evil.example/', 'https://user@wintc.top/', 'http://wintc.top/', 'https://wintc.top:8080/']) assert.throws(() => wechatShareUrl(invalid))
  assert.notEqual(wechatSignature('ticket', 'nonce', 1, wechatShareUrl(url)), wechatSignature('ticket', 'nonce', 1, 'https://wintc.top/article/1?a=2&b=%2f'))
})

test('missing credentials disable WeChat without contacting an upstream', async t => {
  credentials(t)
  delete process.env.WECHAT_APP_SECRET
  const fetch = t.mock.method(global, 'fetch', async () => { throw new Error('Unexpected fetch') })
  assert.equal(await wechat().getWechatShareConfig(SITE.url), null)
  assert.equal(fetch.mock.callCount(), 0)
})

test('concurrent signatures reuse a cached ticket and never return credentials', async t => {
  credentials(t)
  const fetch = t.mock.method(global, 'fetch', async url => Response.json(url.pathname.endsWith('/token') ? { access_token: 'private-access-token' } : { errcode: 0, ticket: 'private-ticket', expires_in: 7200 }))
  const { getWechatShareConfig } = wechat()
  const configs = await Promise.all(Array.from({ length: 8 }, (_, i) => getWechatShareConfig(`${SITE.url}/article/${i}`)))
  assert.equal(fetch.mock.callCount(), 2)
  assert.equal(new Set(configs.map(c => c.nonceStr)).size, 8)
  await getWechatShareConfig(`${SITE.url}/products`)
  assert.equal(fetch.mock.callCount(), 2)
  for (const config of configs) {
    assert.deepEqual(Object.keys(config).sort(), ['appId', 'nonceStr', 'signature', 'timestamp'])
    assert.match(config.signature, /^[a-f0-9]{40}$/)
    assert.doesNotMatch(JSON.stringify(config), /test-secret|private-ticket|private-access-token/)
  }
})

test('an upstream failure is redacted and throttled before retry', async t => {
  credentials(t)
  const fetch = t.mock.method(global, 'fetch', async () => { throw new Error('URL contains test-secret') })
  const { getWechatShareConfig } = wechat()
  await assert.rejects(getWechatShareConfig(SITE.url), { message: 'WeChat configuration is temporarily unavailable' })
  await assert.rejects(getWechatShareConfig(SITE.url), { message: 'WeChat configuration is temporarily unavailable' })
  assert.equal(fetch.mock.callCount(), 1)
})

class ApiError extends Error { constructor(status) { super('API error'); this.status = status } }
function cover(getImageShare) {
  return load('app/tools/share/[token]/cover/route.ts', {
    '@/lib/api/image-shares': { getImageShare }, '@/lib/api/client': { ApiError },
    '@/lib/config': { INTERNAL_API_BASE_URL: 'http://internal.test/api' },
  }).GET
}
test('stable cover refreshes the public share ticket and redirects only its first output to Qiniu without proxying image bytes', async t => {
  let count = 0
  const handler = cover(async token => {
    assert.equal(token, 'public-share')
    return { outputs: [{ url: `/image-assets/first-output/?ticket=fresh-${++count}` }, { url: '/image-assets/second-output/?ticket=unused' }] }
  })
  const urls = []
  t.mock.method(global, 'fetch', async url => { urls.push(url); return Response.json({ url: 'https://s3.cn-south-1.qiniucs.com/private/image.png?signature=test' }) })
  for (let i = 0; i < 2; i++) {
    const response = await handler(new Request(SITE.url), { params: Promise.resolve({ token: 'public-share' }) })
    assert.equal(response.status, 302)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.match(response.headers.get('location'), /^https:\/\/s3\./)
    assert.equal(await response.text(), '')
  }
  assert.deepEqual(urls, ['http://internal.test/api/image-assets/first-output/?ticket=fresh-1&resolve=1', 'http://internal.test/api/image-assets/first-output/?ticket=fresh-2&resolve=1'])
})
test('revoked shares do not fetch or expose any image', async t => {
  const fetch = t.mock.method(global, 'fetch', async () => { throw new Error('Unexpected fetch') })
  const handler = cover(async () => { throw new ApiError(404) })
  const response = await handler(new Request(SITE.url), { params: Promise.resolve({ token: 'revoked' }) })
  assert.equal(response.status, 404)
  assert.equal(await response.text(), '')
  assert.equal(fetch.mock.callCount(), 0)
})
