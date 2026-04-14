'use client'

import { App, Button, Input, Table } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { getTagList } from '@/lib/api/tags'
import { getTopicList } from '@/lib/api/topics'
import {
  addTagAction,
  updateTagAction,
  deleteTagAction,
  addTopicAction,
  updateTopicAction,
  deleteTopicAction,
} from '@/app/actions/tags'

type Item = { id: number; title: string; postCount?: number }

export default function ManageTopicClient() {
  const [tags, setTags] = useState<Item[]>([])
  const [topics, setTopics] = useState<Item[]>([])
  const { message, modal } = App.useApp()

  const loadTags = useCallback(async () => {
    try {
      const r = await getTagList()
      setTags((r.list || []) as Item[])
    } catch {}
  }, [])

  const loadTopics = useCallback(async () => {
    try {
      const r = await getTopicList()
      setTopics((r.list || []) as Item[])
    } catch {}
  }, [])

  useEffect(() => {
    loadTags()
    loadTopics()
  }, [loadTags, loadTopics])

  const buildColumns = (
    kind: 'tag' | 'topic',
    setLocal: (items: Item[]) => void,
    items: Item[],
  ) => [
    {
      title: '名称',
      key: 'title',
      render: (_: unknown, row: Item, index: number) => (
        <Input
          value={row.title}
          onChange={(e) => {
            const next = [...items]
            next[index] = { ...next[index], title: e.target.value }
            setLocal(next)
          }}
          onBlur={async () => {
            const action = kind === 'tag' ? updateTagAction : updateTopicAction
            const r = await action({ id: row.id, title: items[index].title })
            if (r.ok) message.success('已保存')
            else message.error(r.error || '保存失败')
          }}
        />
      ),
    },
    { title: '相关文章', dataIndex: 'postCount', key: 'postCount', width: 100 },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, row: Item) => (
        <Button
          danger
          size="small"
          onClick={() =>
            modal.confirm({
              title: `确定删除${kind === 'tag' ? '标签' : '专题'}${row.title}吗？`,
              onOk: async () => {
                const action = kind === 'tag' ? deleteTagAction : deleteTopicAction
                const r = await action(row.id)
                if (r.ok) {
                  kind === 'tag' ? loadTags() : loadTopics()
                } else {
                  message.error(r.error || '删除失败')
                }
              },
            })
          }
        >
          删除
        </Button>
      ),
    },
  ]

  const addTag = async () => {
    const r = await addTagAction({ title: '新标签' })
    if (r.ok) loadTags()
    else message.error(r.error || '添加失败')
  }

  const addTopic = async () => {
    const r = await addTopicAction({ title: '新专题' })
    if (r.ok) loadTopics()
    else message.error(r.error || '添加失败')
  }

  return (
    <div className="flex h-full gap-2 p-2">
      <div className="flex flex-1 flex-col overflow-hidden bg-white shadow">
        <div className="flex shrink-0 items-center justify-between p-2">
          <span className="font-bold">专题</span>
          <Button size="small" type="primary" onClick={addTopic}>
            + 添加
          </Button>
        </div>
        <div className="flex-1 overflow-auto">
          <Table
            rowKey="id"
            dataSource={topics}
            columns={buildColumns('topic', setTopics, topics)}
            pagination={false}
            size="small"
          />
        </div>
      </div>
      <div className="flex flex-1 flex-col overflow-hidden bg-white shadow">
        <div className="flex shrink-0 items-center justify-between p-2">
          <span className="font-bold">标签</span>
          <Button size="small" type="primary" onClick={addTag}>
            + 添加
          </Button>
        </div>
        <div className="flex-1 overflow-auto">
          <Table
            rowKey="id"
            dataSource={tags}
            columns={buildColumns('tag', setTags, tags)}
            pagination={false}
            size="small"
          />
        </div>
      </div>
    </div>
  )
}
