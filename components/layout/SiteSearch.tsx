'use client'

import { useEffect, useRef, useState } from 'react'
import { Input, Spin } from 'antd'
import Link from 'next/link'
import algoliasearch, { type SearchClient } from 'algoliasearch'
import { ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY, ALGOLIA_INDEX_NAME } from '@/lib/config'

interface Hit {
  id: number
  title: string
}

export default function SiteSearch() {
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Hit[]>([])
  const [show, setShow] = useState(false)
  const clientRef = useRef<SearchClient | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    clientRef.current = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY)
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShow(false)
      }
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  const search = async () => {
    if (!keyword || !clientRef.current) return
    setShow(true)
    setLoading(true)
    setResults([])
    try {
      const index = clientRef.current.initIndex(ALGOLIA_INDEX_NAME)
      const { hits } = await index.search<Hit>(keyword, {
        attributesToRetrieve: ['id', 'title'],
      })
      setResults(hits || [])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={containerRef} className="global-search relative">
      <Input.Search
        placeholder="输入关键词搜索"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        onSearch={search}
        style={{ width: 200 }}
      />
      {show && (
        <div className="fp absolute right-0 top-full mt-1 max-h-[60vh] w-[300px] max-w-[90vw] overflow-auto rounded bg-[#f5f5f5] py-2 text-sm opacity-95">
          {loading ? (
            <div className="flex justify-center p-3">
              <Spin size="small" />
            </div>
          ) : results.length ? (
            results.map((r) => (
              <div key={r.id} className="border-b border-[#e2e2e3] px-3 py-1 last:border-0">
                <Link
                  href={`/article/${r.id}`}
                  onClick={() => setShow(false)}
                  className="hover:underline"
                >
                  {r.title}
                </Link>
              </div>
            ))
          ) : (
            <div className="px-3 py-1 text-center text-[#999]">未检索到相关结果</div>
          )}
        </div>
      )}
    </div>
  )
}
