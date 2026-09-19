# 图片工具上传兼容规则

上传、拖拽和粘贴共用同一处理流程，扫码上传也一致。

- 按文件头识别 JPEG、PNG、WebP、HEIC/HEIF、AVIF、BMP、TIFF 和 GIF，不依赖后缀或浏览器 MIME。空 MIME、image/jpg 等标记不会误拦截真实照片。
- JPEG、PNG、WebP 在配置范围内保持图片字节不变；其他格式在浏览器转成 WebP（不支持编码时使用 PNG）。本机源文件不会被修改，七牛保存的是上传后的兼容副本。
- HEIC/HEIF、单页 TIFF 按需加载解码器，在 Worker 中处理；结束或超时释放 Worker。TIFF 保留方向和透明度。AVIF、BMP 和静态 GIF 使用浏览器解码能力。
- 动画 GIF/AVIF/APNG/WebP、多页 TIFF、RAW、SVG、PSD 不在支持范围。损坏或不支持的编码显示可读错误。
- 转换后仍按后台大小、像素和边长配置自动优化，七牛直传及后端真实解码校验不变。TIFF 解码设置 8000 万像素、最长边 16000 的设备保护边界；转换最多等待 90 秒。
- 兼容转换不改变模型、生成参数和生成结果尺寸。仅记录转换目标格式及压缩前后体积，不记录照片或文件名。

验证：`node --test tests/image-formats.test.cjs`；`node tests/image-compression.browser.cjs`。
真实上传验证：设置 `IMAGE_TOOLS_TEST_URL` 后运行 `node tests/image-formats.browser.cjs`，需要本机 Chrome 与可用的七牛配置；只创建并删除草稿，不调用付费生图。测试图片仅在内存中创建或读取，不保存到仓库。
