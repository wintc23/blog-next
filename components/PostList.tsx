'use client'

import Link from 'next/link'
import { timeShow } from '@/lib/utils'
import type { Post } from '@/lib/types'
import { useSite, useUser } from '@/lib/store'
import Pagination from './Pagination'

interface Props {
  list: Post[]
  total: number
  page: number
  perPage: number
  basePath: string
  header?: React.ReactNode
}

/**
 * Markup mirrors blog-ssr's `pages/index.vue` PostList template.
 * Layout/responsive rules live in globals.css under `.page-post-list`.
 */
export default function PostList({
  list,
  total,
  page,
  perPage,
  basePath,
  header,
}: Props) {
  const site = useSite()
  const user = useUser()
  const typeById = new Map(site.postTypes.map((t) => [t.id, t]))

  return (
    <div className="page-post-list">
      {header}
      <div className="post-list">
        {list.map((post) => {
          const type = post.typeId != null ? typeById.get(post.typeId) : undefined
          return (
            <article key={post.id} className="post ws">
              <div className="post-abstract-main">
                <div className="post-abstract">
                  <Link href={`/article/${post.id}`} className="post-title">
                    {post.title}
                  </Link>
                  <div className="post-info-common">
                    {type && (
                      <span
                        className="post-type"
                        title={`文章分类:${type.name}`}
                      >
                        {type.name}
                      </span>
                    )}
                    <span className="post-date">{timeShow(post.timestamp)}</span>
                  </div>
                  <div
                    className="post-abstract-content"
                    dangerouslySetInnerHTML={{ __html: post.abstract || '' }}
                  />
                </div>
                {post.abstractImage && (
                  <div className="post-abstract-image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={post.abstractImage} alt={post.title} />
                  </div>
                )}
              </div>
              <aside className="post-info">
                <Link href={`/article/${post.id}`} className="look-all">
                  阅读全文
                </Link>
                {user?.admin && (
                  <Link
                    href={`/manage/article?postId=${post.id}`}
                    className="edit"
                  >
                    编辑
                  </Link>
                )}
                <div className="placeholder" />
                <div className="info-item read">
                  浏览(<span>{post.readTimes}</span>)
                </div>
                <div className="info-item like">
                  赞(<span>{post.likes}</span>)
                </div>
                <div className="info-item comment">
                  评论(<span>{post.commentTimes}</span>)
                </div>
              </aside>
            </article>
          )
        })}
      </div>
      <Pagination
        total={total}
        perPage={perPage}
        page={page}
        hrefFor={(p) => `${basePath}?page=${p}`}
      />
    </div>
  )
}
