'use client'

import { App, Button, Pagination, Table } from 'antd'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { getCommentsForModeration } from '@/lib/api/comments'
import {
  deleteCommentAction,
  setCommentShowAction,
} from '@/app/actions/comments'
import { formatTime } from '@/lib/utils'
import type { Comment } from '@/lib/types'

const PER_PAGE = 20

type Row = Comment & {
  postTitle?: string
  postId?: number
  author?: { username?: string }
  hide?: boolean
}

export default function ManageCommentClient() {
  const [list, setList] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const { message, modal } = App.useApp()

  const load = useCallback(
    async (p: number) => {
      setLoading(true)
      try {
        const res = await getCommentsForModeration({ page: p, perPage: PER_PAGE })
        setList((res.list || []) as Row[])
        setTotal(res.total || 0)
      } catch {
        message.error('加载失败')
      } finally {
        setLoading(false)
      }
    },
    [message],
  )

  useEffect(() => {
    load(page)
  }, [load, page])

  const pass = async (row: Row) => {
    const r = await setCommentShowAction(row.id)
    if (r.ok) load(page)
    else message.error(r.error || '操作失败')
  }

  const remove = (row: Row) => {
    modal.confirm({
      title: '确定删除该评论吗？',
      content: row.body,
      onOk: async () => {
        const r = await deleteCommentAction(row.id)
        if (r.ok) load(page)
        else message.error(r.error || '删除失败')
      },
    })
  }

  const columns = [
    { title: '评论文章', dataIndex: 'postTitle', key: 'postTitle', ellipsis: true },
    { title: '评论内容', dataIndex: 'body', key: 'body', ellipsis: true },
    {
      title: '用户',
      key: 'author',
      width: 140,
      render: (_: unknown, row: Row) => row.author?.username || row.authorId,
    },
    {
      title: '链接',
      key: 'link',
      width: 200,
      render: (_: unknown, row: Row) =>
        row.postId ? (
          <Link
            href={`/article/${row.postId}?commentId=${row.id}`}
            className="text-[#409eff] underline"
          >
            查看
          </Link>
        ) : null,
    },
    {
      title: '评论时间',
      key: 'time',
      width: 160,
      align: 'center' as const,
      render: (_: unknown, row: Row) => formatTime(row.timestamp),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      align: 'center' as const,
      render: (_: unknown, row: Row) => (
        <>
          {row.hide && (
            <Button type="primary" size="small" className="mr-2" onClick={() => pass(row)}>
              通过
            </Button>
          )}
          <Button danger size="small" onClick={() => remove(row)}>
            删除
          </Button>
        </>
      ),
    },
  ]

  return (
    <div className="flex h-full flex-col p-3">
      <div className="flex-1 overflow-auto">
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={list}
          pagination={false}
          size="small"
          bordered
        />
      </div>
      <div className="shrink-0 border-t pt-2 text-center">
        <Pagination
          current={page}
          total={total}
          pageSize={PER_PAGE}
          showSizeChanger={false}
          onChange={setPage}
        />
      </div>
    </div>
  )
}
