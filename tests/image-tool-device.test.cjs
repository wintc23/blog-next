const {test} = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')
const fs = require('node:fs')
const source = fs.readFileSync(require('node:path').join(__dirname, '../lib/image-tools.ts'), 'utf8')
const output = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const mod = {exports:{}}
new Function('require','module','exports',output)(name => name === './api/client' ? {} : name === './config' ? {BASE_URL:'/api'} : name === './utils' ? {} : require(name),mod,mod.exports)
const {deviceKind} = mod.exports

test('desktop detection is independent of viewport width', () => {
  assert.equal(deviceKind('Mozilla/5.0 (Windows NT 10.0; Win64; x64)',0,true),'desktop')
  assert.equal(deviceKind('Mozilla/5.0 (Macintosh; Intel Mac OS X)',0,true),'desktop')
})
test('phones and tablets receive distinct upload entry labels', () => {
  assert.equal(deviceKind('Mozilla/5.0 (iPhone; CPU iPhone OS)',5,false),'phone')
  assert.equal(deviceKind('Mozilla/5.0 (Linux; Android 14) Mobile',5,false),'phone')
  assert.equal(deviceKind('Mozilla/5.0 (Macintosh; Intel Mac OS X)',5,true),'other')
  assert.equal(deviceKind('Mozilla/5.0 (Linux; Android 14)',5,false),'other')
  assert.equal(deviceKind('unknown',0,false),'other')
})
