import Link from 'next/link'
import type { ReactNode } from 'react'
import styles from './BackLink.module.css'

export default function BackLink({ href, children, className = '' }: {
  href: string; children: ReactNode; className?: string
}) {
  return <Link href={href} className={`${styles.link} ${className}`}>
    <span className={styles.arrow} aria-hidden="true">←</span>
    <span>{children}</span>
  </Link>
}
