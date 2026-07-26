'use client'

import { App, Button, Table, Tag } from 'antd'
import { EyeOutlined, PlusOutlined } from '@ant-design/icons'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { deleteProduct, getProducts } from '@/lib/api/products'
import type { Product } from '@/lib/schemas/product'

export default function ManageProductClient() {
  const { message, modal } = App.useApp()
  const [list, setList] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getProducts(false, true)
      setList(data.list)
    } catch {
      message.error('加载作品失败')
    } finally {
      setLoading(false)
    }
  }, [message])

  useEffect(() => {
    load()
  }, [load])

  const remove = (product: Product) => {
    modal.confirm({
      title: `确定删除作品「${product.name}」吗？`,
      content: '删除后无法恢复。',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteProduct(product.id)
          message.success('已删除')
          load()
        } catch (error) {
          message.error(error instanceof Error ? error.message : '删除失败')
        }
      },
    })
  }

  const columns = [
    {
      title: '作品',
      key: 'product',
      render: (_: unknown, product: Product) => (
        <div className="flex items-center gap-3">
          {product.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.logoUrl} alt="" className="h-9 w-9 rounded-lg object-cover" />
          ) : (
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg font-bold text-white"
              style={{ backgroundColor: product.accentColor }}
            >
              {product.name.slice(0, 1)}
            </div>
          )}
          <div>
            <div className="font-medium text-[#333]">{product.name}</div>
            <div className="text-xs text-[#999]">/products/{product.slug}</div>
          </div>
        </div>
      ),
    },
    { title: '平台', dataIndex: 'platform', width: 120 },
    { title: '版本', dataIndex: 'version', width: 90 },
    {
      title: '状态',
      key: 'status',
      width: 110,
      render: (_: unknown, product: Product) => (
        <Tag color={product.published ? 'success' : 'default'}>
          {product.published ? '已发布' : '草稿'}
        </Tag>
      ),
    },
    {
      title: '展示',
      key: 'featured',
      width: 90,
      render: (_: unknown, product: Product) =>
        product.featured ? <Tag color="blue">重点</Tag> : null,
    },
    { title: '排序', dataIndex: 'sort', width: 80 },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_: unknown, product: Product) => (
        <div className="flex gap-2">
          <Link href={`/manage/product/edit?productId=${product.id}`}>
            <Button size="small" type="primary">编辑</Button>
          </Link>
          <Link href={`/products/${product.slug}`} target="_blank">
            <Button size="small" icon={<EyeOutlined />}>预览</Button>
          </Link>
          <Button size="small" danger onClick={() => remove(product)}>删除</Button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="m-0 text-xl text-[#333]">作品管理</h1>
          <div className="mt-1 text-sm text-[#888]">新增和发布作品，无需修改前端代码。</div>
        </div>
        <Link href="/manage/product/edit">
          <Button type="primary" icon={<PlusOutlined />}>新增作品</Button>
        </Link>
      </div>

      <Table
        rowKey="id"
        bordered
        size="small"
        loading={loading}
        columns={columns}
        dataSource={list}
        pagination={false}
      />
    </div>
  )
}
