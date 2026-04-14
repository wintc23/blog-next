'use client'

import { Button, Select, Table, Tag, App, Pagination } from 'antd'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getPostType, getPostsByType } from '@/lib/api/posts'
import { addPostAction, deletePostAction } from '@/app/actions/posts'
import { formatTime } from '@/lib/utils'
import type { Post, PostType } from '@/lib/types'

const PER_PAGE = 50

export default function ManageArticleListClient() {
  const router = useRouter()
  const sp = useSearchParams()
  const { message, modal } = App.useApp()

  const [types, setTypes] = useState<PostType[]>([])
  const [list, setList] = useState<Post[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const urlType = sp.get('type')
  const currentType = urlType
    ? Number(urlType)
    : types.find((t) => t.default)?.id || types[0]?.id || 0
  const currentPage = Number(sp.get('page') || 1)

  const loadTypes = useCallback(async () => {
    try {
      const res = await getPostType()
      const arr = (res.list || []).slice().sort((a, b) => (a.sort || 0) - (b.sort || 0))
      setTypes(arr)
    } catch {}
  }, [])

  const loadList = useCallback(async () => {
    if (!currentType) return
    setLoading(true)
    try {
      const res = await getPostsByType({
        page: currentPage,
        perPage: PER_PAGE,
        postType: currentType,
      })
      setList(res.list || [])
      setTotal(res.total || 0)
    } catch {
      message.error('加载文章失败')
    } finally {
      setLoading(false)
    }
  }, [currentType, currentPage, message])

  useEffect(() => {
    loadTypes()
  }, [loadTypes])

  useEffect(() => {
    loadList()
  }, [loadList])

  const updateQuery = (patch: Record<string, string | number>) => {
    const q = new URLSearchParams(sp.toString())
    for (const k in patch) q.set(k, String(patch[k]))
    router.push(`/manage?${q.toString()}`)
  }

  const addNew = async () => {
    const r = await addPostAction(currentType)
    if (r.ok) {
      router.push(`/manage/article?postId=${r.data.id}`)
    } else {
      message.error(r.error || '新建失败')
    }
  }

  const remove = (post: Post) => {
    modal.confirm({
      title: `确定删除文章《${post.title}》吗？`,
      onOk: async () => {
        const r = await deletePostAction(post.id)
        if (r.ok) loadList()
        else message.error(r.error || '删除失败')
      },
    })
  }

  const columns = useMemo(
    () => [
      { title: '标题', dataIndex: 'title', key: 'title' },
      {
        title: '是否公开',
        key: 'hide',
        width: 100,
        align: 'center' as const,
        render: (_: unknown, row: Post & { hide?: boolean }) => (
          <Tag color={row.hide ? 'warning' : 'success'}>
            {row.hide ? '未发布' : '已发布'}
          </Tag>
        ),
      },
      {
        title: '创建时间',
        key: 'timestamp',
        width: 160,
        align: 'center' as const,
        render: (_: unknown, row: Post) => formatTime(row.timestamp),
      },
      {
        title: '阅读次数',
        dataIndex: 'readTimes',
        key: 'readTimes',
        width: 100,
        align: 'center' as const,
      },
      {
        title: '操作',
        key: 'action',
        width: 160,
        align: 'center' as const,
        render: (_: unknown, row: Post) => (
          <>
            <Link href={`/manage/article?postId=${row.id}`}>
              <Button type="primary" size="small" className="mr-2">
                编辑
              </Button>
            </Link>
            <Button danger size="small" onClick={() => remove(row)}>
              删除
            </Button>
          </>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div className="flex h-full flex-col p-3">
      <div className="flex shrink-0 items-center gap-3 border-b border-[#d2d2d2] pb-3">
        <Button type="primary" size="small" onClick={addNew}>
          添加文章
        </Button>
        <Select
          size="small"
          value={currentType || undefined}
          style={{ width: 160 }}
          onChange={(v) => updateQuery({ type: v, page: 1 })}
          options={types.map((t) => ({ label: t.name, value: t.id }))}
        />
      </div>
      <div className="flex-1 overflow-auto py-2">
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
      <div className="shrink-0 border-t border-[#d2d2d2] pt-2 text-center">
        <Pagination
          total={total}
          current={currentPage}
          pageSize={PER_PAGE}
          showSizeChanger={false}
          onChange={(p) => updateQuery({ page: p })}
        />
      </div>
    </div>
  )
}
