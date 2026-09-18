// Run with node tests/image-compression.browser.cjs against the installed Chrome.
const { chromium } = require('playwright')
const ts = require('typescript')
const fs = require('node:fs')
const assert = require('node:assert/strict')
;(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  try {
    for (const mobile of [false, true]) {
      const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1360, height: 900 }, isMobile: mobile, hasTouch: mobile })
      const page = await context.newPage()
      const source = ts.transpileModule(fs.readFileSync('lib/prepare-tool-image.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
      await page.addScriptTag({ content: '{ const exports = {}; ' + source + '; window.compression = exports; }' })
      const results = await page.evaluate(async () => {
        const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 1000
        const ctx = canvas.getContext('2d'); const pixels = ctx.createImageData(1600,1000)
        let seed = 17
        for (let i=0;i<pixels.data.length;i++) { seed=(Math.imul(seed,1664525)+1013904223)>>>0; pixels.data[i]=i%4===3?255:seed>>>24 }
        ctx.putImageData(pixels,0,0)
        const blob = await new Promise(resolve=>canvas.toBlob(resolve,'image/png'))
        const file = new File([blob],'photo.png',{type:'image/png'})
        const policy={maxBytes:20*1024*1024,maxPixels:40000000,maxEdge:16000,processingMaxEdge:2048}
        const unchanged = await window.compression.prepareToolImage(file,policy)
        const compressed = await window.compression.prepareToolImage(file,{...policy,maxBytes:64*1024})
        const bitmap=await createImageBitmap(compressed)
        const reduced=await window.compression.prepareToolImage(file,{...policy,maxPixels:500000})
        const resized=await createImageBitmap(reduced)
        const originalToBlob=HTMLCanvasElement.prototype.toBlob
        HTMLCanvasElement.prototype.toBlob=function(callback) { return originalToBlob.call(this,callback,'image/png') }
        ctx.clearRect(0,0,1600,1000);ctx.fillRect(400,250,800,500)
        const alphaFile = new File([await new Promise(resolve=>canvas.toBlob(resolve,'image/png'))],'alpha.png',{type:'image/png'})
        const fallback=await window.compression.prepareToolImage(alphaFile,{...policy,maxPixels:500000})
        HTMLCanvasElement.prototype.toBlob=originalToBlob
        const alpha=await createImageBitmap(fallback);canvas.width=alpha.width;canvas.height=alpha.height;ctx.drawImage(alpha,0,0)
        const transparency=ctx.getImageData(0,0,1,1).data[3]
        const result={unchanged:unchanged===file,before:file.size,after:compressed.size,width:bitmap.width,height:bitmap.height,pixels:resized.width*resized.height,fallbackType:fallback.type,transparency}
        bitmap.close();resized.close();alpha.close();return result
      })
      assert(results.unchanged)
      assert(results.after<=64*1024)
      assert(Math.abs(results.width/results.height-1.6)<.02)
      assert(results.pixels<=500000)
      assert.equal(results.fallbackType,'image/png')
      assert.equal(results.transparency,0)
      console.log(mobile?'mobile':'desktop',results)
      await context.close()
    }
  } finally { await browser.close() }
})().catch(error=>{console.error(error);process.exitCode=1})
