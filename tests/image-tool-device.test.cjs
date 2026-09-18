const {test} = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')
const fs = require('node:fs')
const source = fs.readFileSync(require('node:path').join(__dirname, '../lib/image-tools.ts'), 'utf8')
const output = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const mod = {exports:{}}
new Function('require','module','exports',output)(name => name === './api/client' ? {apiFetch: async () => ({maxBytes:20971520,maxPixels:40000000,maxEdge:16000,processingMaxEdge:2048})} : name === './prepare-tool-image' ? {prepareToolImage: async file => file} : name === './config' ? {BASE_URL:'/api'} : name === './stat-event' ? {trackEvent: () => {}} : name === './utils' ? {getTokenClient: () => 'site-session'} : require(name),mod,mod.exports)
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


test('uploads bytes directly to Qiniu and sends only tickets to the site', async t => {
  const calls=[]
  t.mock.method(global,'fetch', async (url, options) => {
    calls.push({url,options})
    if (calls.length===1) return Response.json({upload_url:'https://up.test',key:'private/key',token:'scoped-upload',ticket:'task-ticket'})
    return Response.json({id:'asset'})
  })
  await mod.exports.uploadToolImage(new File(['bytes'],'photo.png',{type:'image/png'}),'draft')
  assert.equal(calls.length,3)
  assert.equal(calls[1].url,'https://up.test')
  assert.equal(calls[1].options.headers,undefined)
  assert.equal(calls[1].options.body.get('file').size,5)
  assert.equal(JSON.parse(calls[0].options.body).action,'authorize')
  assert.deepEqual(JSON.parse(calls[2].options.body),{action:'complete',ticket:'task-ticket'})
  assert.equal(calls[0].options.headers.Authorization,'site-session')
})

test('ZIP downloads read Qiniu bytes in the client without forwarding account credentials', async t => {
  let objectBlob, clicked=false
  const calls=[]
  t.mock.method(global,'fetch', async (url, options) => {
    calls.push({url,options})
    return url==='/api/archive' ? Response.json({files:[{url:'https://cloud.test/a',name:'01_a.png'},{url:'https://cloud.test/b',name:'02_b.png'}]}) : new Response(url.endsWith('/a')?'first':'second')
  })
  t.mock.method(URL,'createObjectURL', blob => { objectBlob=blob; return 'blob:fixture' })
  t.mock.method(global,'setTimeout',()=>0)
  const original=global.document
  global.document={createElement:()=>({click:()=>{clicked=true},remove:()=>{}}),body:{appendChild:()=>{}}}
  t.after(()=>{global.document=original})
  await mod.exports.downloadBlob('/api/archive','images.zip',true)
  const files=require('fflate').unzipSync(new Uint8Array(await objectBlob.arrayBuffer()))
  assert.equal(clicked,true)
  assert.deepEqual(Object.keys(files),['01_a.png','02_b.png'])
  assert.equal(new TextDecoder().decode(files['02_b.png']),'second')
  assert.equal(calls[0].options.headers.Authorization,'site-session')
  assert(calls.slice(1).every(c=>c.options.headers===undefined&&c.options.credentials==='omit'))
})
