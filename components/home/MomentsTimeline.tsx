'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Empty, Spin } from 'antd'
import { getLifeMomentGroups, type LifeMomentGroups } from '@/lib/api/life-moments'
import { mergeMomentGroups } from '@/lib/life-moments'
import MomentCard from './MomentCard'
import styles from './LifeMoments.module.css'

export default function MomentsTimeline({ initial }: { initial: LifeMomentGroups }) {
  const [groups, setGroups] = useState(initial.groups)
  const [page, setPage] = useState(initial.page)
  const [hasMore, setHasMore] = useState(initial.page * initial.perPage < initial.totalDates)
  const [loading, setLoading] = useState(false), [error, setError] = useState('')
  const pending = useRef<AbortController | null>(null), sentinel = useRef<HTMLDivElement>(null)
  useEffect(() => () => { pending.current?.abort(); pending.current = null }, [])
  const loadMore = useCallback(async () => {
    if (pending.current || !hasMore) return
    const controller = new AbortController(); pending.current = controller
    setLoading(true); setError('')
    try {
      const next = await getLifeMomentGroups(page + 1, false, controller.signal)
      if (controller.signal.aborted) return
      setGroups(current => mergeMomentGroups(current, next.groups))
      setPage(next.page)
      setHasMore(next.groups.length > 0 && next.page * next.perPage < next.totalDates)
    } catch {
      if (!controller.signal.aborted) setError('加载失败，请重试')
    } finally {
      if (!controller.signal.aborted) { pending.current = null; setLoading(false) }
    }
  }, [page, hasMore])
  useEffect(() => {
    if (!hasMore || loading || error || !sentinel.current || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) void loadMore()
    }, { rootMargin: '320px 0px' })
    observer.observe(sentinel.current)
    return () => observer.disconnect()
  }, [hasMore, loading, error, loadMore])

  if (!groups.length) return <Empty className={styles.archiveEmpty} image={false} styles={{ image: { display: 'none' } }} description="暂无生活动态" />
  return <>
    <div className={styles.timeline} aria-busy={loading}>{groups.map(group => <section key={group.date} className={styles.dateGroup} aria-labelledby={`date-${group.date}`}>
      <h2 id={`date-${group.date}`}><time dateTime={group.date}>{group.date.replaceAll('-', '.')}</time><span>{group.moments.length} 条动态</span></h2>
      <ol>{group.moments.map(moment => <li key={moment.id}><MomentCard moment={moment} grouped /></li>)}</ol>
    </section>)}</div>
    <div ref={sentinel} aria-hidden="true" className={styles.loadSentinel} />
    <div className={styles.loadMore}>
      {loading ? <span role="status"><Spin size="small" /> 正在加载</span> : error ? <><span role="status">{error}</span><Button type="link" onClick={() => void loadMore()}>重试</Button></> : hasMore ? <Button type="link" onClick={() => void loadMore()}>加载更多</Button> : <span>已显示全部动态</span>}
    </div>
  </>
}
