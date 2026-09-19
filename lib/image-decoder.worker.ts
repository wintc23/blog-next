export {}
// Loaded only for formats that need an extra decoder. No image bytes leave the device.
self.onmessage = async (event: MessageEvent<{ file: File; mime: string }>) => {
  try {
    const { file, mime } = event.data
    let bitmap: ImageBitmap
    if (mime === 'image/heic') {
      const { heicTo } = await import('heic-to/next')
      bitmap = await heicTo({ blob: file, type: 'bitmap' })
    } else {
      const { decode, decodeImage, toRGBA8 } = await import('utif')
      const buffer = await file.arrayBuffer(), pages = decode(buffer)
      if (pages.length !== 1) throw new Error('请上传单页 TIFF 图片')
      const page = pages[0]
      const tag = (name: string): number => Array.isArray(page[name]) ? Number((page[name] as number[])[0]) : 0
      const width = tag('t256'), height = tag('t257')
      if (!width || !height || width * height > 80_000_000 || Math.max(width, height) > 16000) throw new Error('这张 TIFF 的解码尺寸过大，请先缩小后再上传')
      if (page.t50706) throw new Error('暂不支持 RAW 原始照片，请先导出为普通照片')
      decodeImage(buffer, page)
      const rgba = toRGBA8(page)
      const pixels = new ImageData(new Uint8ClampedArray(rgba), width, height)
      const orientation = tag('t274') || 1
      const raw = new OffscreenCanvas(width, height); raw.getContext('2d')!.putImageData(pixels, 0, 0)
      const rotated = orientation >= 5 && orientation <= 8
      const canvas = new OffscreenCanvas(rotated ? height : width, rotated ? width : height)
      const ctx = canvas.getContext('2d')!
      const transforms: Record<number, [number, number, number, number, number, number]> = {
        2: [-1, 0, 0, 1, width, 0], 3: [-1, 0, 0, -1, width, height], 4: [1, 0, 0, -1, 0, height],
        5: [0, 1, 1, 0, 0, 0], 6: [0, 1, -1, 0, height, 0], 7: [0, -1, -1, 0, height, width], 8: [0, -1, 1, 0, 0, width],
      }
      if (transforms[orientation]) ctx.setTransform(...transforms[orientation])
      ctx.drawImage(raw, 0, 0); bitmap = canvas.transferToImageBitmap()
      raw.width = raw.height = canvas.width = canvas.height = 1
    }
    self.postMessage({ bitmap }, { transfer: [bitmap] })
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : '图片解码失败' })
  }
}
