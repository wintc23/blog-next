'use client'

import { useId, useRef, useState } from 'react'
import { Button, Popover, type GetRef } from 'antd'
import { CloseOutlined, MailOutlined, WechatOutlined } from '@ant-design/icons'
import type { PersonalProfile } from '@/lib/schemas/personal-profile'
import styles from './ContactPopover.module.css'

export default function ContactPopover({ profile }: {
  profile: PersonalProfile
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const trigger = useRef<GetRef<typeof Button>>(null)
  const card = useRef<HTMLDivElement>(null)
  if (!profile.contactEmail && !profile.wechatId && !profile.wechatQrUrl) return null

  const close = () => {
    setOpen(false)
    trigger.current?.focus({ preventScroll: true })
  }

  return (
    <Popover
      trigger="click" placement="bottom" open={open} onOpenChange={setOpen}
      autoAdjustOverflow destroyOnHidden styles={{ body: { padding: 0 } }}
      afterOpenChange={(visible) => { if (visible) card.current?.focus({ preventScroll: true }) }}
      content={
        <div ref={card} id={id} role="dialog" aria-label="联系方式" tabIndex={-1} className={styles.card}
          onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); close() } }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget) && event.relatedTarget !== trigger.current) setOpen(false)
          }}
        >
          <div className={styles.heading}>
            {profile.avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt="" width={42} height={42} className={styles.avatar} />
            )}
            <div className={styles.identity}>
              <strong>{profile.displayName}</strong>
              {profile.contactNote && <p>{profile.contactNote}</p>}
            </div>
            <Button type="text" aria-label="关闭联系方式" onClick={close} className={styles.close}>
              <CloseOutlined aria-hidden />
            </Button>
          </div>
          {profile.contactEmail && (
            <div className={styles.email}>
              <span className={styles.label}><MailOutlined aria-hidden />邮箱</span>
              <a href={`mailto:${profile.contactEmail.split('@').map((part) => encodeURIComponent(part)).join('@')}`}>{profile.contactEmail}</a>
            </div>
          )}
          {(profile.wechatId || profile.wechatQrUrl) && (
            <div className={styles.wechat}>
              <div className={styles.wechatHeading}>
                <span className={styles.label}><WechatOutlined aria-hidden />微信</span>
                {profile.wechatId && <span className={styles.wechatId}>{profile.wechatId}</span>}
              </div>
              {profile.wechatQrUrl && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={styles.qr} src={profile.wechatQrUrl} alt={`${profile.displayName}的微信二维码`} width={180} height={180} />
                  <p className={styles.hint}>微信扫码或长按识别二维码</p>
                </>
              )}
            </div>
          )}
        </div>
      }
    >
      <Button ref={trigger} type="link" className={styles.trigger}
        aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined}>
        联系我
      </Button>
    </Popover>
  )
}
