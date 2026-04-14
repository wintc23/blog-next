'use client'

import { Button } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useEffect } from 'react'

export default function RouteError({
  error,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  // Hide the sidebar modules column while the error boundary is active —
  // an error screen only needs the centred illustration, a sidebar full
  // of recommended posts feels out of place. A body class is the least
  // invasive way to coordinate with AppShell without rerouting through
  // state or context.
  useEffect(() => {
    document.body.classList.add('error-active')
    return () => {
      document.body.classList.remove('error-active')
    }
  }, [])

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div
        className="ws w-full max-w-[480px] rounded-md text-center"
        style={{ padding: '56px 48px' }}
      >
        {/* Friendly coffee-cup illustration: a steaming cup tipped over to
            convey "spilled / something went wrong" without the alarming
            red cross. Colours pull from the site's blue accent. */}
        <svg
          viewBox="0 0 160 130"
          width="160"
          height="130"
          className="mx-auto block"
          aria-hidden
        >
          {/* steam */}
          <path
            d="M58 30 Q53 22 60 14 Q67 8 62 0"
            stroke="#b8dbff"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M78 30 Q73 22 80 14 Q87 8 82 0"
            stroke="#b8dbff"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M98 30 Q93 22 100 14 Q107 8 102 0"
            stroke="#b8dbff"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          {/* cup body */}
          <path
            d="M40 40 L120 40 L114 100 Q113 110 102 110 L58 110 Q47 110 46 100 Z"
            fill="#eaf4ff"
            stroke="#409eff"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* coffee surface */}
          <ellipse cx="80" cy="40" rx="40" ry="6" fill="#409eff" />
          {/* handle */}
          <path
            d="M120 52 Q140 52 140 72 Q140 92 120 92"
            fill="none"
            stroke="#409eff"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* saucer */}
          <ellipse cx="80" cy="116" rx="56" ry="6" fill="rgba(64,158,255,0.15)" />
        </svg>
        <p className="mt-6 text-base text-[#4e5969]">
          加载这个页面时发生了一点小意外
        </p>
        <p className="mt-1 text-sm text-[#86909c]">稍等片刻再刷新试试</p>
        {/* AntD Button as base, with extra padding, pill shape, soft
            blue shadow, and a hover-lift / icon-spin effect added via
            className so it sits at AntD's component level rather than a
            raw <button>. */}
        <div className="mt-8 flex justify-center">
          <Button
            type="primary"
            size="large"
            shape="round"
            icon={<ReloadOutlined className="reload-icon" />}
            onClick={() => window.location.reload()}
            className="error-refresh-btn"
          >
            刷新页面
          </Button>
        </div>
      </div>
    </div>
  )
}
