export function decodeSpecialImage(file: File, mime: string): Promise<ImageBitmap> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./image-decoder.worker.ts', import.meta.url))
    const finish = () => { clearTimeout(timer); worker.terminate() }
    const timer = setTimeout(() => { finish(); reject(new Error('图片转换超时，请尝试较小的图片')) }, 90000)
    worker.onmessage = event => {
      finish()
      if (event.data.bitmap) resolve(event.data.bitmap)
      else reject(new Error(event.data.error || '无法转换这张图片，请尝试重新导出照片'))
    }
    worker.onerror = () => { finish(); reject(new Error('图片转换失败，请刷新后重试或重新导出照片')) }
    worker.postMessage({ file, mime })
  })
}
