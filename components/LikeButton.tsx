'use client'

import { useEffect, useRef, useState } from 'react'
import { App, Button } from 'antd'
import { HeartFilled, HeartOutlined, LoadingOutlined } from '@ant-design/icons'
import { getLikeState, setLiked, type LikeState, type LikeTarget } from '@/lib/api/likes'
import { useUser } from '@/lib/store'
import { useAuthenticatedAction } from '@/lib/use-authenticated-action'
import styles from './LikeButton.module.css'

export default function LikeButton({ target, id, initialState = { likes: 0, like: false } }: {
  target: LikeTarget; id: number | string; initialState?: LikeState
}) {
  const user = useUser()
  const authenticate = useAuthenticatedAction()
  const { message } = App.useApp()
  const [state, setState] = useState(initialState)
  const [pending, setPending] = useState(false)
  const locked = useRef(false)
  const version = useRef(0)

  useEffect(() => {
    // Login during a click must not start a read that overwrites its result.
    if (locked.current) return
    const controller = new AbortController()
    const requestVersion = ++version.current
    setState((current) => ({ ...current, like: false }))
    getLikeState(target, id, controller.signal).then((result) => {
      if (!controller.signal.aborted && requestVersion === version.current) setState(result)
    }).catch(() => { /* A click retries the read and displays any failure. */ })
    return () => { controller.abort() }
  }, [target, id, user?.id])

  const toggle = async () => {
    if (locked.current) return
    locked.current = true
    ++version.current
    setPending(true)
    try {
      const result = await authenticate(async () => {
        // Read after authentication so recovered sessions toggle their own like.
        const current = await getLikeState(target, id)
        return setLiked(target, id, !current.like)
      })
      setState(result)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '点赞失败，请重试')
    } finally {
      locked.current = false
      setPending(false)
    }
  }

  return (
    <Button type="text" className={styles.button} aria-label="点赞" aria-pressed={state.like}
      aria-busy={pending} disabled={pending} onClick={toggle} title={state.like ? '取消点赞' : '赞一下'}>
      {pending ? <LoadingOutlined aria-hidden="true" /> : state.like ? <HeartFilled aria-hidden="true" /> : <HeartOutlined aria-hidden="true" />}
      <span>{state.like ? '已赞' : '点赞'}</span>
      {state.likes > 0 && <span className={styles.count}>{state.likes}</span>}
    </Button>
  )
}
