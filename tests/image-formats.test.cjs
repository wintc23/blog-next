const { test } = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript'), fs = require('node:fs'), vm = require('node:vm')
const exportsObject = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/image-formats.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exportsObject, Uint8Array, DataView, Error })
const { imageMime, assertStaticGif } = exportsObject
const bytes = value => Uint8Array.from(Buffer.from(value, 'latin1'))
test('recognizes actual bytes without filename or MIME metadata', () => {
  for (const [header, type] of [['\xff\xd8\xff', 'jpeg'], ['\x89PNG\r\n\x1a\n', 'png'], ['RIFF0000WEBP', 'webp'], ['GIF89a', 'gif'], ['BM', 'bmp'], ['II*\x00', 'tiff'], ['MM\x00*', 'tiff']]) assert.equal(imageMime(bytes(header)), 'image/' + type)
  for (const [brand, type] of [['heic', 'heic'], ['mif1', 'heic'], ['avif', 'avif']]) assert.equal(imageMime(bytes('\x00\x00\x00\x18ftyp' + brand + '\x00\x00\x00\x00' + brand + 'mif1')), 'image/' + type)
  assert.throws(() => imageMime(bytes('<svg>')), /暂不支持/)
  assert.throws(() => imageMime(bytes('')), /暂不支持/)
  assert.throws(() => imageMime(bytes('\x00\x00\x00\x14ftypavis0000avif')), /动画/)
})
test('GIF parser distinguishes animation from static images and truncated data', () => {
  const header = 'GIF89a\x01\x00\x01\x00\x00\x00\x00'
  const frame = ',\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x44\x01\x00'
  assert.doesNotThrow(() => assertStaticGif(bytes(header + frame + ';')))
  assert.throws(() => assertStaticGif(bytes(header + frame + frame + ';')), /动画/)
  assert.throws(() => assertStaticGif(bytes(header + frame)), /不完整/)
})
