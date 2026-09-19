export const IMAGE_UPLOAD_ACCEPT = '.jpg,.jpeg,.jfif,.png,.webp,.heic,.heif,.avif,.bmp,.tif,.tiff,.gif,image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif,image/bmp,image/tiff,image/gif'
export const IMAGE_FORMAT_HINT = '支持 JPG、PNG、WebP、HEIC / HEIF、AVIF、BMP、TIFF 和静态 GIF，自动转换兼容格式，较大的图片会自动优化。'

/** Inspect bytes rather than trusting a filename or browser-supplied MIME. */
export function imageMime(header: Uint8Array): string {
  const text = (at: number, count: number) => String.fromCharCode(...header.slice(at, at + count))
  if (header[0] === 255 && header[1] === 216 && header[2] === 255) return 'image/jpeg'
  if (text(0, 8) === '\x89PNG\r\n\x1a\n') return 'image/png'
  if (text(0, 4) === 'RIFF' && text(8, 4) === 'WEBP') return 'image/webp'
  if (['GIF87a', 'GIF89a'].includes(text(0, 6))) return 'image/gif'
  if (text(0, 2) === 'BM') return 'image/bmp'
  if (text(0, 4) === 'II*\x00' || text(0, 4) === 'MM\x00*') return 'image/tiff'
  if (text(4, 4) === 'ftyp') {
    const size = new DataView(header.buffer, header.byteOffset, header.byteLength).getUint32(0)
    const brands = [text(8, 4)]
    for (let at = 16; at + 4 <= Math.min(size, header.length); at += 4) brands.push(text(at, 4))
    if (brands.includes('avis') || brands.includes('msf1')) throw new Error('暂不支持动画图片，请选择静态照片')
    if (brands.includes('avif')) return 'image/avif'
    if (brands.some(brand => ['heic', 'heix', 'hevc', 'hevx', 'mif1'].includes(brand))) return 'image/heic'
  }
  throw new Error('暂不支持这种图片格式，请选择常见照片格式；SVG、RAW 和 PSD 暂不支持')
}

export function assertStaticGif(bytes: Uint8Array) {
  let at = 13 + (bytes[10] & 128 ? 3 * (1 << ((bytes[10] & 7) + 1)) : 0), frames = 0
  const blocks = () => { while (at < bytes.length) { const size = bytes[at++]; if (!size) return; at += size } }
  while (at < bytes.length) {
    const marker = bytes[at++]
    if (marker === 0x3b) return
    if (marker === 0x21) { at++; blocks(); continue }
    if (marker !== 0x2c || at + 9 > bytes.length) throw new Error('GIF 文件损坏，无法读取')
    if (++frames > 1) throw new Error('暂不支持动画 GIF，请选择静态图片')
    const packed = bytes[at + 8]; at += 9
    if (packed & 128) at += 3 * (1 << ((packed & 7) + 1))
    at++; blocks()
  }
  throw new Error('GIF 文件不完整，无法读取')
}
