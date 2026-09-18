import Link from 'next/link'
import { MOMENT_CATEGORIES, type ProfileMoment } from '@/lib/schemas/personal-profile'
import { momentClock, momentTimeLabel } from '@/lib/life-moments'
import MomentGallery from './MomentGallery'
import styles from './LifeMoments.module.css'

export default function MomentCard({ moment, compact = false, grouped = false, detail = false }: {
  moment: ProfileMoment; compact?: boolean; grouped?: boolean; detail?: boolean
}) {
  const category = MOMENT_CATEGORIES.find(({ value }) => value === moment.category)?.label
  const time = <time dateTime={moment.occurredAt || moment.date}>{grouped ? momentClock(moment) || '当天记录' : momentTimeLabel(moment)}</time>
  const meta = <div className={styles.meta}><span>{category}{moment.location ? ` · ${moment.location}` : ''}</span>
    {detail || compact ? time : <Link href={`/moments/${moment.id}`} aria-label={`查看 ${momentTimeLabel(moment)} 的动态`}>{time}</Link>}
  </div>
  const content = <>{meta}<p className={styles.text}>{moment.text}</p></>

  if (compact) return (
    <article className={styles.compactCard}>
      <Link href={`/moments/${moment.id}`} className={styles.compactLink}>
        {content}
        {!!moment.images.length && <div className={styles.previewImages}>
          {moment.images.slice(0, 3).map((picture, index) => <figure key={index}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={picture.url} alt={picture.description || `动态照片 ${index + 1}`} width={120} height={90} loading="lazy" decoding="async" />
            {index === 2 && moment.images.length > 3 && <span className={styles.moreImages}>+{moment.images.length - 3}</span>}
          </figure>)}
        </div>}
      </Link>
    </article>
  )
  return <article className={`${styles.card} ${detail ? styles.detailCard : ''}`}>
    {content}
    <MomentGallery images={moment.images} />
  </article>
}
