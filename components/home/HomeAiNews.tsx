import Link from 'next/link'
import type { AiDigestHome } from '@/lib/schemas/ai-digest'
import { formatCount } from '@/lib/utils'
import styles from './HomeAiNews.module.css'

export default function HomeAiNews({ data }: { data: AiDigestHome }) {
  const { featured, previous, isToday, settings } = data
  if (!featured) return null
  return (
    <section className={styles.section} aria-labelledby="ai-news-title">
      <header className={styles.header}>
        <h2 id="ai-news-title">{settings?.title || featured.channelTitle}</h2>
        <span>AI NEWS{!settings?.introduction && <><i aria-hidden="true" /> {settings?.publishTime} 北京时间</>}</span>
      </header>
      {settings?.introduction && <p className={styles.introduction}>
        {settings.introduction.summary}
        {settings.introduction.groups.map(group => <span key={group.id}>
          <strong>「{group.title}」</strong>{group.description}
        </span>)}
        {settings.introduction.note}
      </p>}
      <div className={styles.grid}>
        <article className={styles.featured}>
          <Link href={`/ai-news/${featured.id}`} className={styles.visual} aria-label={`阅读${isToday ? '今日' : '最新'}动态：${featured.title}`}>
            {featured.cover && <img src={featured.cover.url} alt={featured.cover.alt} width={featured.cover.width || 1200} height={featured.cover.height || 420} />}
          </Link>
          <div className={styles.copy}>
            <div className={styles.meta}><span className={styles.today}>{isToday ? '今日动态' : '最新动态'}</span><time dateTime={featured.issueDate}>{featured.issueDate.replaceAll('-', '.')}</time><span>{formatCount(featured.readTimes)} 次阅读</span></div>
            <h3><Link href={`/ai-news/${featured.id}`}>{featured.title}</Link></h3>
            <p>{featured.summary}</p>
            <div className={styles.actions}>
              {!!featured.groups?.length && <div className={styles.groups}>{featured.groups.map(group => <Link key={group.id} href={`/ai-news/${featured.id}#digest-group-${group.id}`}>{group.title}<span>{group.count}</span></Link>)}</div>}
              <Link href={`/ai-news/${featured.id}`} className={styles.read}>阅读全文 <span aria-hidden="true">↗</span></Link>
            </div>
          </div>
        </article>
        <aside className={styles.history} aria-labelledby="ai-news-history-title">
          <div className={styles.historyHeader}><h3 id="ai-news-history-title">往日动态</h3><span>PREVIOUS</span></div>
          {previous.length ? <ol>{previous.map((item, index) => <li key={item.id}>
            <Link href={`/ai-news/${item.id}`}>
              <span className={styles.number} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <div><div className={styles.meta}><time dateTime={item.issueDate}>{item.issueDate.replaceAll('-', '.')}</time><span>{formatCount(item.readTimes)} 次阅读</span></div><h4>{item.title}</h4></div>
            </Link>
          </li>)}</ol> : <p className={styles.empty}>往期动态将陆续收录。</p>}
          <Link href="/ai-news" className={styles.more}>更多历史动态 <span aria-hidden="true">→</span></Link>
        </aside>
      </div>
    </section>
  )
}
