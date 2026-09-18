const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const ts = require('typescript')
function load(file, mocks = {}) {
  const module = { exports: {} }
  const { outputText } = ts.transpileModule(readFileSync(require('node:path').join(__dirname, '..', file), 'utf8'), {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS}})
  new Function('require', 'module', 'exports', outputText)((name) => mocks[name] || require(name), module, module.exports)
  return module.exports
}
const rich = load('lib/rich-content.ts')
const { CommentLink, commentDocument, commentText } = load('lib/comment-editor.ts', {'./rich-content': rich})
test('rich drafts retain links, bold, whitespace and blank paragraphs on reload', () => {
  for (const value of ['', '你好 世界 ', '第一段\n\n下一段\n', '[选中文字](https://example.test/a?q=1)', '**强调** 普通文字', '<script>alert(1)</script>']) {
    assert.equal(commentText(commentDocument(value)), value)
  }
})
test('plain URLs become editable links without swallowing trailing punctuation', () => {
  const doc = commentDocument('看看 https://example.test/a。')
  assert.equal(doc.content[0].content[1].marks[0].attrs.href, 'https://example.test/a')
  assert.equal(commentText(doc), '看看 [https://example.test/a](https://example.test/a)。')
})
test('unsafe links cannot acquire link marks or become serialized links', () => {
  const doc = commentDocument('[坏链接](javascript:alert)')
  assert.equal(doc.content[0].content[0].marks, undefined)
  assert.equal(commentText({content:[{type:'paragraph', content:[{type:'text',text:'label',marks:[{type:'link',attrs:{href:'javascript:alert(1)'}}]}]}]}), 'label')
})
test('parentheses in pasted URL serialize safely, and hard breaks persist', () => {
  assert.equal(commentText({content:[{type:'paragraph',content:[{type:'text',text:'链接',marks:[{type:'link',attrs:{href:'https://example.test/(a)'}}]},{type:'hardBreak'},{type:'text',text:'下一行'}]}]}), '[链接](https://example.test/%28a%29)\n下一行')
})

test('replacing a selected existing link retains only the new destination', () => {
  const { getSchema } = require('@tiptap/core')
  const StarterKit = require('@tiptap/starter-kit').default
  const schema = getSchema([StarterKit, CommentLink])
  const previous = schema.marks.link.create({href:'https://example.test/old'})
  const replacement = schema.marks.link.create({href:'https://example.test/new'})
  const marks = replacement.addToSet([previous])
  assert.equal(marks.length, 1)
  assert.equal(marks[0].attrs.href, 'https://example.test/new')
})
