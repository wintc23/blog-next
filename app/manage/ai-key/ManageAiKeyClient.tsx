'use client'

import {
  App,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Switch,
  Table,
  Tag,
  Tooltip,
} from 'antd'
import { CopyOutlined, PlusOutlined } from '@ant-design/icons'
import { useCallback, useEffect, useState } from 'react'
import dayjs from 'dayjs'
import {
  createManageAiKey,
  deleteManageAiKey,
  listManageAiKeys,
  updateManageAiKey,
  type AiAccessKey,
} from '@/lib/api/ai-chat'
import { formatTime } from '@/lib/utils'

interface FormValues {
  name: string
  enabled: boolean
  usageLimit?: number | null
  expiresAt?: dayjs.Dayjs | null
}

export default function ManageAiKeyClient() {
  const [list, setList] = useState<AiAccessKey[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AiAccessKey | null>(null)
  const [createdKey, setCreatedKey] = useState('')
  const [form] = Form.useForm<FormValues>()
  const { message, modal } = App.useApp()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listManageAiKeys()
      setList(res.list || [])
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }, [message])

  useEffect(() => {
    load()
  }, [load])

  const showCreate = () => {
    setEditing(null)
    setCreatedKey('')
    form.setFieldsValue({ name: '', enabled: true, usageLimit: null, expiresAt: null })
    setOpen(true)
  }

  const showEdit = (row: AiAccessKey) => {
    setEditing(row)
    setCreatedKey('')
    form.setFieldsValue({
      name: row.name,
      enabled: row.enabled,
      usageLimit: row.usageLimit ?? null,
      expiresAt: row.expiresAt ? dayjs(row.expiresAt * 1000) : null,
    })
    setOpen(true)
  }

  const submit = async () => {
    const values = await form.validateFields()
    const payload = {
      name: values.name,
      enabled: values.enabled,
      usageLimit: values.usageLimit ?? null,
      expiresAt: values.expiresAt ? values.expiresAt.format('YYYY-MM-DD') : null,
    }
    if (editing) {
      await updateManageAiKey(editing.id, payload)
      setOpen(false)
      await load()
      return
    }
    const created = await createManageAiKey(payload)
    setCreatedKey(created.key || '')
    await load()
  }

  const remove = (row: AiAccessKey) => {
    modal.confirm({
      title: '删除该 AI key？',
      content: `将同时删除「${row.name}」下的所有会话、消息和相关文件。`,
      onOk: async () => {
        await deleteManageAiKey(row.id)
        await load()
      },
    })
  }

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true },
    {
      title: 'Key',
      key: 'keyPreview',
      width: 230,
      render: (_: unknown, row: AiAccessKey) => (
        <div className="flex items-center justify-center gap-1">
          <span className="font-mono text-xs text-[#555]">{row.keyPreview}</span>
          <Tooltip title={row.key ? '复制完整 key' : '旧 key 无完整值，请重新创建'}>
            <Button
              type="link"
              size="small"
              className="px-1"
              icon={<CopyOutlined />}
              disabled={!row.key}
              onClick={async () => {
                if (!row.key) return
                await navigator.clipboard.writeText(row.key)
                message.success('已复制')
              }}
            />
          </Tooltip>
        </div>
      ),
      align: 'center' as const,
    },
    {
      title: '状态',
      key: 'enabled',
      width: 100,
      align: 'center' as const,
      render: (_: unknown, row: AiAccessKey) =>
        row.enabled ? <Tag color="success">启用</Tag> : <Tag>停用</Tag>,
    },
    {
      title: '用量',
      key: 'usage',
      width: 140,
      align: 'center' as const,
      render: (_: unknown, row: AiAccessKey) =>
        `${row.usageCount || 0}${row.usageLimit ? ` / ${row.usageLimit}` : ''}`,
    },
    {
      title: '过期时间',
      key: 'expiresAt',
      width: 170,
      align: 'center' as const,
      render: (_: unknown, row: AiAccessKey) =>
        row.expiresAt ? formatTime(row.expiresAt) : '长期有效',
    },
    {
      title: '最近使用',
      key: 'lastUsedAt',
      width: 170,
      align: 'center' as const,
      render: (_: unknown, row: AiAccessKey) =>
        row.lastUsedAt ? formatTime(row.lastUsedAt) : '未使用',
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      align: 'center' as const,
      render: (_: unknown, row: AiAccessKey) => (
        <>
          <Button type="primary" size="small" className="mr-2" onClick={() => showEdit(row)}>
            编辑
          </Button>
          <Button size="small" danger onClick={() => remove(row)}>
            删除
          </Button>
        </>
      ),
    },
  ]

  return (
    <div className="flex h-full flex-col p-3">
      <div className="flex shrink-0 items-center gap-3 border-b border-[#d2d2d2] pb-3">
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={showCreate}>
          新建 Key
        </Button>
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
      <Modal
        open={open}
        title={editing ? '编辑 Key' : '新建 Key'}
        onCancel={() => setOpen(false)}
        onOk={() => {
          if (createdKey) setOpen(false)
          else submit()
        }}
        okText={createdKey ? '完成' : '保存'}
      >
        {createdKey ? (
          <div>
            <div className="mb-2 text-sm text-[#666]">请立即保存该 key，关闭后无法再次查看。</div>
            <Input.TextArea className="font-mono text-xs" value={createdKey} autoSize readOnly />
            <Button
              className="mt-2"
              icon={<CopyOutlined />}
              onClick={async () => {
                await navigator.clipboard.writeText(createdKey)
                message.success('已复制完整 key')
              }}
            >
              复制完整 key
            </Button>
          </div>
        ) : (
          <Form form={form} layout="vertical">
            <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
              <Input maxLength={128} />
            </Form.Item>
            <Form.Item name="enabled" label="启用" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="usageLimit" label="使用次数上限">
              <InputNumber className="w-full" min={1} placeholder="不填则不限" />
            </Form.Item>
            <Form.Item name="expiresAt" label="过期时间">
              <DatePicker className="w-full" />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  )
}
