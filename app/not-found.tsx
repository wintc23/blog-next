import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <h2 className="text-2xl font-bold">页面找不到了哦</h2>
      <p className="mt-4">
        <Link href="/" className="text-[#409eff] underline">
          返回首页
        </Link>
      </p>
    </div>
  )
}
