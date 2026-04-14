'use client'

import { Button } from 'antd'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="py-20 text-center">
      <h2 className="text-2xl font-bold">页面出错了</h2>
      <p className="mt-4 text-[#666]">
        {error.message || '服务器暂时不可用，请稍后重试'}
      </p>
      <div className="mt-6">
        <Button type="primary" onClick={reset}>
          重试
        </Button>
      </div>
    </div>
  )
}
