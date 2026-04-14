import Link from 'next/link'

interface Props {
  total: number
  perPage: number
  page: number
  /** Function that returns the href for a given page number */
  hrefFor: (page: number) => string
}

export default function Pagination({ total, perPage, page, hrefFor }: Props) {
  const totalPage = Math.ceil(total / perPage)
  if (totalPage <= 1) return null
  const pages = Array.from({ length: totalPage }, (_, i) => i + 1)
  return (
    <div className="mt-4 text-center">
      <div className="inline-block text-left">
        {pages.map((p) => (
          <Link
            key={p}
            href={hrefFor(p)}
            className={`m-2 inline-block h-9 w-9 rounded text-center font-bold leading-9 ${
              p === page ? 'text-[#409eff]' : 'text-[#333] hover:bg-[#ddd]'
            } bg-white`}
          >
            {p}
          </Link>
        ))}
      </div>
    </div>
  )
}
