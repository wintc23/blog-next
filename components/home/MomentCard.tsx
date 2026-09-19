import Link from 'next/link'
import { MOMENT_CATEGORIES, type ProfileMoment } from '@/lib/schemas/personal-profile'
import LikeButton from '@/components/LikeButton'
import MomentSelection from './MomentSelection'
import MomentEditLink from './MomentEditLink'
import MomentGallery from './MomentGallery'
import styles from './LifeMoments.module.css'

export default function MomentCard({ moment, compact = false, detail = false }: {
  moment: ProfileMoment; compact?: boolean; grouped?: boolean; detail?: boolean
}) {
  const category = MOMENT_CATEGORIES.find(({ value }) => value === moment.category)?.label
  const dateLabel = moment.date.replaceAll('-', '.')
  const date = <time dateTime={moment.date}>{dateLabel}</time>
  const meta = <div className={styles.meta}><span>{category}{moment.location ? ` · ${moment.location}` : ''}</span>
    {detail || compact ? date : <Link href={`/moments/${moment.id}`} aria-label={`查看 ${dateLabel} 的动态`}>{date}</Link>}
  </div>
  const content = <>{meta}<p className={styles.text}>{moment.text}</p></>

  if (compact) return (
    <article className={styles.compactCard}>
      <Link href={`/moments/${moment.id}`} className={styles.compactLink}>
        <p className={styles.text}>{moment.text}</p>
        {!!moment.images.length && <div className={styles.previewImages}>
          {moment.images.slice(0, 3).map((picture, index) => <figure key={index}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={picture.url} alt={picture.description || `动态照片 ${index + 1}`} width={120} height={120} loading="lazy" decoding="async" />
            {index === 2 && moment.images.length > 3 && <span className={styles.moreImages}>+{moment.images.length - 3}</span>}
          </figure>)}
        </div>}
      </Link>
      <div className={styles.compactFooter}><div className={styles.compactMeta}>{date}{moment.location && <>{' '}<span title={moment.location}>{moment.location}</span></>}</div><LikeButton target="moment" id={moment.id} /></div>
    </article>
  )
  const card = <article className={`${styles.card} ${detail ? styles.detailCard : ''}`}>
    {content}
    <MomentGallery images={moment.images} momentId={moment.id} />
    <div className={styles.momentActions}><LikeButton target="moment" id={moment.id} /><MomentEditLink id={moment.id} /></div>
  </article>
  return detail ? <MomentSelection>{card}</MomentSelection> : card
}
