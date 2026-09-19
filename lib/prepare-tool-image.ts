import { imageMime, assertStaticGif } from './image-formats'
import { decodeSpecialImage } from './decode-special-image'
/** Browser-only preprocessing; original files remain untouched on the user's device. */
export type UploadPolicy = { maxBytes: number; maxPixels: number; maxEdge: number; processingMaxEdge: number }

export function fitDimensions(width: number, height: number, maxPixels: number, maxEdge: number) {
  const scale = Math.min(1, Math.sqrt(maxPixels / (width * height)), maxEdge / Math.max(width, height))
  return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)) }
}

export async function prepareToolImage(file: File, policy: UploadPolicy, notice?: (text: string) => void): Promise<File> {
  const header = new Uint8Array(await file.slice(0, 65536).arrayBuffer())
  const detected = imageMime(header)
  if (file.type !== detected) file = new File([file], file.name, { type: detected, lastModified: file.lastModified })
  if (detected === 'image/gif') assertStaticGif(new Uint8Array(await file.arrayBuffer()))
  const convert = !['image/jpeg', 'image/png', 'image/webp'].includes(detected)
  const text = (at: number, count: number) => String.fromCharCode(...header.slice(at, at + count))
  if (text(8, 4) === 'WEBP' && text(12, 4) === 'VP8X' && (header[20] & 2)) throw new Error('请上传静态图片')
  if (text(1, 3) === 'PNG') {
    const view = new DataView(header.buffer)
    for (let at = 8; at + 12 <= header.length;) {
      const kind = text(at + 4, 4)
      if (kind === 'acTL') throw new Error('请上传静态图片')
      if (kind === 'IDAT') break
      at += view.getUint32(at) + 12
    }
  }
  const url = URL.createObjectURL(file)
  const image = new Image()
  let bitmap: ImageBitmap | undefined
  const canvas = document.createElement('canvas')
  try {
    if (convert) notice?.('正在转换图片格式…')
    if (['image/heic', 'image/tiff'].includes(detected)) bitmap = await decodeSpecialImage(file, detected)
    else await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('无法解码这张图片，文件可能损坏或当前浏览器不支持其编码，请重新导出照片后重试'))
      image.src = url
    })
    const width = bitmap?.width || image.naturalWidth, height = bitmap?.height || image.naturalHeight
    if (!width || !height) throw new Error('图片尺寸无效，请重新选择')
    if (!convert && file.size <= policy.maxBytes && width * height <= policy.maxPixels && Math.max(width, height) <= policy.maxEdge) return file
    if (!convert || file.size > policy.maxBytes || width * height > policy.maxPixels) notice?.('图片较大，正在自动优化…')
    // Bound canvas allocation on phones; do not upscale, crop, or flatten alpha.
    let size = fitDimensions(width, height, Math.min(policy.maxPixels, 16_000_000), Math.min(policy.maxEdge, 4096))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('当前设备无法自动优化图片，请换一张或稍后重试')
    const mime = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp'
    for (let step = 0; step < 10; step++) {
      await new Promise(resolve => setTimeout(resolve, 0))
      canvas.width = size.width; canvas.height = size.height
      context.imageSmoothingQuality = 'high'
      context.drawImage(bitmap || image, 0, 0, size.width, size.height)
      const quality = step % 2 === 0 ? .92 : .82
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, mime, quality))
      if (blob && blob.size <= policy.maxBytes) {
        // Safari can return PNG when WebP encoding is unavailable. Honor the actual MIME.
        const extension = blob.type === 'image/jpeg' ? 'jpg' : blob.type === 'image/webp' ? 'webp' : 'png'
        const result = new File([blob], file.name.replace(/\.[^.]+$/, '') + '.' + extension, { type: blob.type, lastModified: file.lastModified })
        notice?.(convert ? '已转换为兼容格式，正在上传…' : '已自动优化图片，正在上传…')
        return result
      }
      if (!blob || step % 2 === 1) {
        const scale = blob ? Math.min(.85, Math.sqrt(policy.maxBytes / blob.size) * .9) : .5
        size = { width: Math.max(1, Math.floor(size.width * scale)), height: Math.max(1, Math.floor(size.height * scale)) }
      }
    }
    throw new Error('这张图片暂时无法自动优化到上传范围，请换一张或稍后重试')
  } finally {
    bitmap?.close()
    image.src = ''
    URL.revokeObjectURL(url)
    canvas.width = canvas.height = 1
  }
}
