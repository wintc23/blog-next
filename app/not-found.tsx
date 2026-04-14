import Link from 'next/link'
import { Button } from 'antd'
import HideSidebarOnMount from '@/components/HideSidebarOnMount'

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <HideSidebarOnMount bodyClass="notfound-active" />
      <div
        className="ws w-full max-w-[480px] rounded-md text-center"
        style={{ padding: '56px 48px' }}
      >
        {/* Big stylised "404" set against a soft blue rounded panel. */}
        <svg
          viewBox="0 0 200 110"
          width="200"
          height="110"
          className="mx-auto block"
          aria-hidden
        >
          <rect
            x="10"
            y="14"
            width="180"
            height="80"
            rx="14"
            fill="#eaf4ff"
            stroke="#b8dbff"
            strokeWidth="3"
          />
          <text
            x="100"
            y="74"
            textAnchor="middle"
            fontSize="52"
            fontWeight="800"
            fill="#409eff"
            fontFamily="system-ui, -apple-system, sans-serif"
            letterSpacing="6"
          >
            404
          </text>
        </svg>
        <p className="mt-6 text-base text-[#4e5969]">页面找不到了</p>
        <p className="mt-1 text-sm text-[#86909c]">
          你访问的内容可能已经被删除、改名或从未存在。
        </p>
        <div className="mt-7">
          <Link href="/">
            <Button type="primary" size="large">
              返回首页
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
