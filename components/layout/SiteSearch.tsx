'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { CloseOutlined, LoadingOutlined, SearchOutlined } from '@ant-design/icons'
import Link from 'next/link'
import { Button, Input, type InputRef } from 'antd'
import algoliasearch, { type SearchClient } from 'algoliasearch'
import { ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY, ALGOLIA_INDEX_NAME } from '@/lib/config'
import styles from './SiteSearch.module.css'

interface Hit { id: number; title: string }

function HighlightedTitle({ title, query }: { title: string; query: string }) {
  const index = title.toLocaleLowerCase().indexOf(query.toLocaleLowerCase())
  if (!query || index < 0) return <>{title}</>
  return <>{title.slice(0, index)}<mark>{title.slice(index, index + query.length)}</mark>{title.slice(index + query.length)}</>
}

export default function SiteSearch() {
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Hit[]>([])
  const [failed, setFailed] = useState(false)
  const [show, setShow] = useState(false)
  const clientRef = useRef<SearchClient | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<InputRef>(null)
  const requestRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resultsId = useId()

  const search = useCallback(async (query: string) => {
    const request = ++requestRef.current
    if (!query) return
    setLoading(true)
    setFailed(false)
    try {
      clientRef.current ||= algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY)
      const { hits } = await clientRef.current.initIndex(ALGOLIA_INDEX_NAME).search<Hit>(query, {
        attributesToRetrieve: ['id', 'title'],
      })
      if (request === requestRef.current) setResults(hits || [])
    } catch {
      if (request === requestRef.current) { setResults([]); setFailed(true) }
    } finally {
      if (request === requestRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    ++requestRef.current
    setResults([])
    setFailed(false)
    const query = keyword.trim()
    setLoading(Boolean(query))
    if (query) timerRef.current = setTimeout(() => { void search(query) }, 300)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      ++requestRef.current
    }
  }, [keyword, search])

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setShow(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  const open = show && Boolean(keyword.trim())
  return <div ref={containerRef} className={styles.search}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setShow(false) }}
    onKeyDown={(event) => {
      if (event.nativeEvent.isComposing) return
      if (event.key === 'Escape') { event.preventDefault(); inputRef.current?.focus(); setShow(false); return }
      if (!open || !['ArrowDown', 'ArrowUp'].includes(event.key)) return
      const links = Array.from(containerRef.current?.querySelectorAll<HTMLAnchorElement>('[data-search-result]') || [])
      if (!links.length) return
      const index = links.indexOf(document.activeElement as HTMLAnchorElement)
      if (event.target === inputRef.current?.input || index >= 0) {
        event.preventDefault()
        if (event.key === 'ArrowUp' && index <= 0) inputRef.current?.focus()
        else links[Math.min(links.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))]?.focus()
      }
    }}>
    <form role="search" aria-label="搜索已归档博客" className={styles.field}
      onSubmit={(event) => {
        event.preventDefault()
        if (timerRef.current) clearTimeout(timerRef.current)
        setShow(Boolean(keyword.trim()))
        void search(keyword.trim())
      }}>
      <Button type="text" htmlType="submit" className={styles.iconButton} aria-label="搜索博客" aria-controls={open ? resultsId : undefined} aria-expanded={open}><SearchOutlined aria-hidden="true" /></Button>
      <Input variant="borderless" ref={inputRef} type="search" aria-label="搜索已归档博客" placeholder="搜索归档文章" autoComplete="off" maxLength={120}
        value={keyword} aria-controls={open ? resultsId : undefined}
        onFocus={() => { if (keyword.trim()) setShow(true) }}
        onChange={(event) => { ++requestRef.current; setKeyword(event.target.value); setShow(Boolean(event.target.value.trim())) }} />
      {keyword && <Button type="text" className={[styles.iconButton, styles.clear].join(' ')} aria-label="清除搜索" onClick={() => { setKeyword(''); setShow(false); inputRef.current?.focus() }}><CloseOutlined aria-hidden="true" /></Button>}
    </form>
    {open && <section id={resultsId} className={styles.panel} aria-label="博客搜索结果" aria-busy={loading}>
      <div className={styles.panelHeading}><span>搜索结果</span>{!loading && !failed && results.length > 0 && <span>{results.length} 篇文章</span>}</div>
      <div className={styles.resultList}>
        {loading ? <p className={styles.notice} role="status"><LoadingOutlined aria-hidden="true" />正在搜索…</p>
          : failed ? <p className={styles.notice} role="status">搜索暂时不可用，请稍后重试</p>
            : results.length ? <ul>
              {results.map((result) => <li key={result.id}>
                <Link href={'/article/' + result.id} data-search-result onClick={() => setShow(false)}>
                  <HighlightedTitle title={result.title} query={keyword.trim()} />
                </Link>
              </li>)}
            </ul>
              : <p className={styles.notice} role="status">没有找到相关文章，试试其他关键词</p>}
      </div>
      {results.length > 0 && !loading && !failed && <span className="sr-only" role="status">找到 {results.length} 篇文章，可用方向键或 Tab 键浏览</span>}
    </section>}
  </div>
}
