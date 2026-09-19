import Link from 'next/link'
import type { ProfileMoment } from '@/lib/schemas/personal-profile'
import MomentCard from './MomentCard'
import styles from './LifeMoments.module.css'

export default function LifeMoments({ moments }: { moments: ProfileMoment[] }) {
  if (!moments.length) return null
  return (
    <aside className={styles.moments} aria-labelledby="life-moments-title">
      <header className={styles.heading}>
        <h2 id="life-moments-title">生活片段</h2>
        <Link href="/moments">全部动态</Link>
      </header>
      <ul className={styles.recentList}>
        {moments.slice(0, 2).map((moment) => <li key={moment.id}><MomentCard moment={moment} compact /></li>)}
      </ul>
    </aside>
  )
}
