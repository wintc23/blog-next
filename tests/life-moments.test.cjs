const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { test } = require('node:test')
const ts = require('typescript')
const { renderToStaticMarkup } = require('react-dom/server')
const React = require('react')

function load(file, mocks = {}) {
  const source = readFileSync(path.join(__dirname, '..', file), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', outputText)((name) => mocks[name] || require(name), module, module.exports)
  return module.exports
}
const schema = load('lib/schemas/personal-profile.ts')
const time = load('lib/life-moments.ts')
const css = new Proxy({}, { get: (_, key) => key === '__esModule' ? false : String(key) })
const Gallery = load('components/home/MomentGallery.tsx', { './LifeMoments.module.css': css, '@/components/CommentImagePreview': () => null }).default
const Card = load('components/home/MomentCard.tsx', {
  'next/link': ({ children, ...props }) => React.createElement('a', props, children),
  '@/lib/schemas/personal-profile': schema, '@/lib/life-moments': time,
  './MomentGallery': Gallery, './LifeMoments.module.css': css,
}).default
const legacy = { id: 'test-id', date: '2026-09-17', text: '旅途', category: 'travel', imageUrl: 'https://example.test/one.jpg', imageAlt: '旧照片' }

test('legacy date-only moments preserve photos and captions; explicit empty galleries remain empty', () => {
  const parsed = schema.ProfileMomentSchema.parse(legacy)
  assert.equal(parsed.occurredAt, null)
  assert.deepEqual(parsed.images, [{ url: legacy.imageUrl, description: '旧照片' }])
  assert.deepEqual(schema.ProfileMomentSchema.parse({ ...legacy, images: [] }).images, [])
  assert.equal(time.momentTimeLabel(parsed), '2026.09.17')
})

test('moment time always displays Beijing time even when the timestamp has another offset', () => {
  assert.equal(time.momentClock({ occurredAt: '2026-09-16T18:30:00Z' }), '02:30')
  assert.equal(time.momentClock({ occurredAt: '2026-09-17T00:00:00+08:00' }), '00:00')
  assert.equal(time.momentClock({ occurredAt: null }), '')
})

test('moment text precedes ordered images, and text and captions cannot inject HTML', () => {
  const moment = schema.ProfileMomentSchema.parse({ ...legacy, text: '<script>记录</script>', images: [
    { url: 'https://example.test/first.jpg', description: '<img src=x onerror=alert(1)>' },
    { url: 'https://example.test/second.jpg', description: '第二张说明' },
  ] })
  for (const compact of [false, true]) {
    const html = renderToStaticMarkup(React.createElement(Card, { moment, compact }))
    assert.ok(html.indexOf('&lt;script&gt;') < html.indexOf('<img'))
    assert.ok(!html.includes('<script>'))
    assert.ok(!html.includes('<img src=x'))
    assert.ok(html.indexOf('src="https://example.test/first.jpg"') < html.indexOf('src="https://example.test/second.jpg"'))
    assert.ok(html.includes('href="/moments/test-id"'))
    if (!compact) assert.ok(html.includes('<figcaption>&lt;img'))
  }
})
