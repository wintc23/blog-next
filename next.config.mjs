/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'file.wintc.top' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  transpilePackages: ['antd', '@ant-design/icons', 'rc-util', 'rc-pagination', 'rc-picker'],
  // Next 15 validates Server Action requests by requiring the `Origin`
  // header to match `x-forwarded-host` / `host`. Our nginx sits in
  // front of PM2 and forwards `X-Forwarded-Host: blog` (the internal
  // upstream name), which never matches the browser's real origin
  // `wintc.top`. Whitelisting the real domain so save-post and every
  // other server action stop 500-ing with "Invalid Server Actions
  // request" (log: `x-forwarded-host header with value 'blog' does
  // not match origin header with value 'wintc.top'`).
  experimental: {
    serverActions: {
      allowedOrigins: ['wintc.top', 'www.wintc.top', 'localhost:8000'],
    },
  },
}

export default nextConfig
