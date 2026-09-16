'use client'

import { useId, useRef } from 'react'
import { CloseOutlined, EnvironmentOutlined } from '@ant-design/icons'
import { MOMENT_CATEGORIES, type ProfileMoment } from '@/lib/schemas/personal-profile'
import styles from './LifeMoments.module.css'

export default function MomentCard({ moment, compact = false }: { moment: ProfileMoment; compact?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const captionId = useId()
  const category = MOMENT_CATEGORIES.find(({ value }) => value === moment.category)?.label
  const alt = moment.imageAlt || `${moment.location || ''}${category}随拍`
  const meta = <span className={styles.meta}><span className={styles.category}>{category}</span><time dateTime={moment.date}>{moment.date.replaceAll('-', '.')}</time></span>
  const location = moment.location && <span className={styles.location}><EnvironmentOutlined aria-hidden />{moment.location}</span>

  return (
    <article className={compact ? styles.compactCard : styles.card}>
      {compact ? (
        <button type="button" className={styles.compactButton} onClick={() => dialog.current?.showModal()}
          aria-haspopup="dialog" aria-label={`查看 ${moment.date} 的${category}动态`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={moment.imageUrl} alt={alt} width={88} height={88} decoding="async" />
          <span className={styles.compactContent}>{meta}<span className={styles.text}>{moment.text}</span>{location}</span>
        </button>
      ) : (
        <>
          <button className={styles.photoButton} type="button" onClick={() => dialog.current?.showModal()}
            aria-label={`查看完整照片：${alt}`} aria-haspopup="dialog">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={moment.imageUrl} alt={alt} width={640} height={400} loading="lazy" decoding="async" />
            <span className={styles.photoHint}>查看照片</span>
          </button>
          <div className={styles.content}>{meta}<p className={styles.text}>{moment.text}</p>{location}</div>
        </>
      )}
      <dialog ref={dialog} className={styles.viewer} aria-label="生活动态详情" aria-describedby={captionId}>
        <div className={styles.viewerClose}><button type="button" aria-label="关闭动态" onClick={() => dialog.current?.close()}><CloseOutlined aria-hidden /></button></div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={moment.imageUrl} alt={alt} width={1200} height={800} loading="lazy" />
        <div className={styles.viewerMeta}>{meta}{location}</div>
        <p id={captionId}>{moment.text}</p>
      </dialog>
    </article>
  )
}
