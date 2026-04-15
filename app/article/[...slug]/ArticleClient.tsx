'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from 'react'
import { Button, Modal, App, Tooltip } from 'antd'
import { HeartFilled, HeartOutlined } from '@ant-design/icons'
import Link from 'next/link'
import ArticleContent from '@/components/ArticleContent'
import CommentInput from '@/components/CommentInput'
import CommentTree from '@/components/CommentTree'
import type { Post } from '@/lib/types'
import {
  useUser,
  useShowLogin,
  useSetOutlineItems,
  useSite,
} from '@/lib/store'
import type { OutlineItem } from '@/lib/store'
import {
  likePostAction,
  cancelLikePostAction,
} from '@/app/actions/posts'
import {
  addCommentAction,
  setCommentShowAction,
} from '@/app/actions/comments'
import { formatTime } from '@/lib/utils'

export default function ArticleClient({ initialPost }: { initialPost: Post }) {
  const [post, setPost] = useState<Post>(initialPost)
  const [comment, setComment] = useState('')
  const [reward, setReward] = useState(false)
  const [, startTransition] = useTransition()
  const [submitting, setSubmitting] = useState(false)
  const user = useUser()
  const showLogin = useShowLogin()
  const site = useSite()
  const postType = site.postTypes?.find((t) => t.id === post.typeId)
  const { message } = App.useApp()
  const setOutlineItems = useSetOutlineItems()
  const articleRef = useRef<HTMLElement>(null)

  // Build the outline from the entire <article> (post title + body
  // headings), matching blog-ssr's `v-outline` behavior.
  const refreshOutline = useCallback(() => {
    if (!articleRef.current) return
    const nodes = articleRef.current.querySelectorAll('h1, h2, h3, h4')
    const items: OutlineItem[] = []
    nodes.forEach((node, i) => {
      const el = node as HTMLElement
      if (!el.id) el.id = `outline-${i}`
      items.push({
        id: el.id,
        title: el.innerText.trim(),
        level: Number(el.tagName.substring(1)),
      })
    })
    setOutlineItems(items)
  }, [setOutlineItems])

  // useLayoutEffect so the outline scan + store update run synchronously
  // before the browser paints the first frame, preventing the sidebar from
  // briefly flashing the non-outline modules (aliyun variants, 热门文章, 标签,
  // 友链) before they are replaced by the 目录 module. SSR is fine — React
  // silently skips useLayoutEffect on the server.
  useLayoutEffect(() => {
    refreshOutline()
    return () => setOutlineItems([])
  }, [refreshOutline, setOutlineItems, post.bodyHtml])

  const like = () => {
    if (!user?.id) {
      showLogin()
      return
    }
    const action = post.like ? cancelLikePostAction : likePostAction
    startTransition(async () => {
      const r = await action(post.id)
      if (r.ok) setPost({ ...post, ...r.data })
      else message.error(r.error || '操作失败')
    })
  }

  const submitComment = async (
    body: string,
    responseId?: number,
    onDone?: () => void,
  ) => {
    if (!body.trim()) {
      message.info('评论不能为空')
      return
    }
    if (!user?.id) {
      showLogin()
      return
    }
    setSubmitting(true)
    const r = await addCommentAction({
      body,
      postId: post.id,
      responseId,
    })
    setSubmitting(false)
    if (r.ok) {
      setPost({ ...post, ...r.data })
      if (!responseId) setComment('')
      message.success('评论成功')
      onDone?.()
    } else {
      message.error(r.error || '网络请求失败')
    }
  }

  const toggleCommentVisibility = async (c: { id: number }, done: () => void) => {
    const r = await setCommentShowAction(c.id)
    if (r.ok) done()
    else message.error(r.error || '操作失败')
  }

  return (
    <div className="article-page">
      <div className="mx-auto max-w-[1000px]">
        <article ref={articleRef} className="ws rounded-sm p-6 sm:p-10">
          <h2 className="text-center text-[26px] font-bold">{post.title}</h2>
          <div className="my-6 text-center text-sm text-[#666]">
            <span>{formatTime(post.timestamp)}</span>
            {postType && (
              <span className="mx-4 text-[#ffa710] font-bold">
                {postType.name}
              </span>
            )}
            <span className="mr-4">
              <span className="underline">{post.readTimes}</span> 次浏览
            </span>
            {user?.admin && (
              <Link
                href={`/manage/article?postId=${post.id}`}
                className="text-[#2d8cf0] underline"
              >
                编辑
              </Link>
            )}
          </div>
          <ArticleContent html={post.bodyHtml || ''} />
          <div className="my-8 text-center">
            <Tooltip title={post.like ? '您赞了该文章' : '赞一下'}>
              <span
                onClick={like}
                className="inline-block min-w-[4em] cursor-pointer select-none rounded border border-[rgba(255,32,32,0.4)] bg-[rgba(255,32,32,0.2)] py-1 text-sm text-[#ff2020]"
              >
                {post.like ? <HeartFilled /> : <HeartOutlined />}
                {post.likes ? ` ${post.likes}` : ''}
              </span>
            </Tooltip>
            <span
              onClick={() => setReward(true)}
              className="ml-3 inline-block min-w-[4em] cursor-pointer select-none rounded border border-[#06b038] py-1 text-sm text-[#06b038] transition hover:bg-[#06b038] hover:text-white"
            >
              ¥赞赏
            </span>
          </div>
          <div className="text-sm text-[#666]">
            {post.before && (
              <div className="my-1">
                <Link href={`/article/${post.before.id}`} className="hover:underline">
                  上一篇：{post.before.title}
                </Link>
              </div>
            )}
            {post.after && (
              <div className="my-1">
                <Link href={`/article/${post.after.id}`} className="hover:underline">
                  下一篇：{post.after.title}
                </Link>
              </div>
            )}
          </div>
        </article>
        <div className="my-5">
          <div className="mb-2 border-b-2 border-[#ddd] px-1 py-3 text-lg font-bold">
            评论({post.commentTimes})
          </div>
          <div className="overflow-hidden">
            <CommentInput
              value={comment}
              onChange={setComment}
              placeholder="既然来了，就说几句吧"
            />
            <Button
              className="btn-success float-right mt-1"
              loading={submitting}
              onClick={() => submitComment(comment)}
            >
              评论
            </Button>
          </div>
          <div className="clear-both pt-10">
            <CommentTree
              list={post.comments || []}
              onReply={submitComment}
              onSetVisibility={toggleCommentVisibility}
            />
          </div>
        </div>
      </div>
      <Modal
        open={reward}
        onCancel={() => setReward(false)}
        closable={false}
        footer={null}
        centered
        width="auto"
        styles={{
          body: { padding: 0, lineHeight: 0 },
          content: { padding: 0, overflow: 'hidden' },
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://file.wintc.top/reward.png?v=1"
          alt="赞赏码"
          className="block h-[80vw] w-[80vw] max-h-[300px] max-w-[300px] align-middle"
        />
      </Modal>
    </div>
  )
}
