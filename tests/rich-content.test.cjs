const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { test } = require('node:test')
const ts = require('typescript')
const { renderToStaticMarkup } = require('react-dom/server')
const React = require('react')

function load(file, mocks = {}) {
  const source = readFileSync(path.join(__dirname, '..', file), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', outputText)((name) => mocks[name] || require(name), module, module.exports)
  return module.exports
}
const rich = load('lib/rich-content.ts')
const preview = load('components/CommentImagePreview.tsx', { './CommentImagePreview.module.css': { default: {} } })
const Body = load('components/RichCommentBody.tsx', { '@/lib/rich-content': rich, './CommentImagePreview': preview }).default
const first = { url: `https://file.wintc.top/managed-images/${'a'.repeat(32)}.jpg`, alt: 'first' }
const second = { url: `https://file.wintc.top/managed-images/${'b'.repeat(32)}.png`, alt: 'second' }

test('text and attachment order round-trip without destroying spaces or newlines while typing', () => {
  for (const text of ['Hello ', '第一段\n\n', '', 'hello world\n第三行']) {
    for (const images of [[], [first], [second, first]]) {
      assert.deepEqual(rich.splitCommentBody(rich.joinCommentBody(text, images)), { text, images })
    }
  }
})
test('rendered text always precedes every image, including older mixed content', () => {
  const html = renderToStaticMarkup(React.createElement(Body, { body: `![first](${first.url})\n文字 [站点](https://example.test)\n![second](${second.url})` }))
  assert.ok(html.indexOf('文字') < html.indexOf('<img'))
  assert.ok(html.indexOf(first.url) < html.indexOf(second.url))
  assert.match(html, /ugc nofollow noopener noreferrer/)
})
test('HTML and malicious links cannot become executable markup', () => {
  const body = '<script>alert(1)</script><img src=x onerror=alert(1)> [x](javascript:alert) [x](data:text/html,test)'
  const html = renderToStaticMarkup(React.createElement(Body, { body }))
  assert.ok(!html.includes('<script'))
  assert.ok(!html.includes('<img'))
  assert.ok(!html.includes('href="javascript:'))
  assert.ok(!html.includes('href="data:'))
  for (const url of ['javascript:alert(1)', 'data:image/svg+xml,test', 'https://user:pass@example.test', 'https://good.test\\@evil.test', '//evil.test', 'https://x.test\n<script>']) assert.equal(rich.safeLink(url), false)
})
test('unregistered external images and non-image uploads are never rendered as images', () => {
  for (const url of ['https://evil.test/managed-images/' + 'a'.repeat(32) + '.jpg', 'https://file.wintc.top/evil.svg', 'data:image/png;base64,test']) {
    assert.equal(rich.safeImage(url), false)
    const html = renderToStaticMarkup(React.createElement(Body, { body: `![x](${url})` }))
    assert.ok(!html.includes('<img'))
  }
})
