'use client'

import {
  App,
  Button,
  Checkbox,
  Input,
  InputNumber,
  Select,
  Switch,
  Upload,
} from 'antd'
import {
  DeleteOutlined,
  EyeOutlined,
  LoadingOutlined,
  PlusOutlined,
  SaveOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Keywords from '@/components/Keywords'
import ProductSectionEditor from './ProductSectionEditor'
import {
  createProduct,
  getProducts,
  updateProduct,
} from '@/lib/api/products'
import { uploadToQiniu } from '@/lib/upload'
import type {
  Product,
  ProductLink,
} from '@/lib/schemas/product'

const EMPTY_PRODUCT: Product = {
  id: 0,
  name: '',
  slug: '',
  tagline: '',
  summary: '',
  platform: '',
  version: '',
  status: 'developing',
  statusLabel: '开发中',
  logoUrl: '',
  coverUrl: '',
  accentColor: '#2d8cf0',
  highlights: [],
  features: [],
  steps: [],
  screenshots: [],
  links: [],
  storyHtml: '',
  sections: [],
  published: false,
  featured: false,
  sort: 0,
  createdAt: null,
  updatedAt: null,
}

function EditorSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-[#e8ebef] bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-5 border-b border-[#edf0f4] pb-4">
        <h2 className="m-0 text-lg text-[#222]">{title}</h2>
        {description && <p className="mb-0 mt-1 text-sm text-[#888]">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function cloneProduct(product: Product): Product {
  return {
    ...product,
    highlights: [...product.highlights],
    features: product.features.map((item) => ({ ...item })),
    steps: product.steps.map((item) => ({ ...item })),
    screenshots: product.screenshots.map((item) => ({ ...item })),
    links: product.links.map((item) => ({ ...item })),
    sections: product.sections.map((section) => ({
      ...section,
      content: JSON.parse(JSON.stringify(section.content)) as Record<string, unknown>,
    })),
  }
}

export default function ManageProductEditorClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const productId = Number(searchParams?.get('productId') || 0)
  const { message } = App.useApp()
  const [draft, setDraft] = useState<Product>(() => cloneProduct(EMPTY_PRODUCT))
  const [loading, setLoading] = useState(Boolean(productId))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState('')

  useEffect(() => {
    if (!productId) {
      setDraft(cloneProduct(EMPTY_PRODUCT))
      setLoading(false)
      return
    }
    setLoading(true)
    getProducts(false, true)
      .then(({ list }) => {
        const product = list.find((item) => item.id === productId)
        if (!product) {
          message.error('找不到该作品')
          router.replace('/manage/product')
          return
        }
        setDraft(cloneProduct(product))
      })
      .catch(() => message.error('加载作品失败'))
      .finally(() => setLoading(false))
  }, [productId, message, router])

  const update = (patch: Partial<Product>) => {
    setDraft((value) => ({ ...value, ...patch }))
  }

  const save = async () => {
    if (!draft.name.trim()) {
      message.info('请输入作品名称')
      return
    }
    if (!draft.slug.trim()) {
      message.info('请输入作品地址')
      return
    }
    setSaving(true)
    try {
      const payload: Product = {
        ...draft,
        features: draft.features.filter((item) => item.title.trim()),
        steps: draft.steps.filter((item) => item.title.trim()),
        screenshots: draft.screenshots.filter((item) => item.url),
        links: draft.links.filter((item) => item.label.trim() && item.url.trim()),
      }
      const saved = draft.id
        ? await updateProduct(draft.id, payload)
        : await createProduct(payload)
      setDraft(cloneProduct(saved))
      message.success('作品已保存')
      if (!productId) router.replace(`/manage/product/edit?productId=${saved.id}`)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const upload = async (file: File, field: 'logoUrl' | 'coverUrl') => {
    setUploading(field)
    try {
      const url = await uploadToQiniu(file)
      update({ [field]: url })
    } catch {
      message.error('图片上传失败')
    } finally {
      setUploading('')
    }
  }

  const updateLink = (index: number, patch: Partial<ProductLink>) => {
    update({
      links: draft.links.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    })
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-[#888]">加载作品中…</div>
  }

  return (
    <div className="h-full overflow-auto bg-[#f5f7fa]">
      <div className="sticky top-0 z-[2] flex items-center gap-3 border-b border-[#e5e7eb] bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <Link href="/manage/product">
          <Button>← 返回作品列表</Button>
        </Link>
        <div className="min-w-0">
          <div className="truncate font-bold text-[#222]">
            {draft.id ? `编辑作品：${draft.name || '未命名'}` : '新增作品'}
          </div>
          <div className="text-xs text-[#999]">
            {draft.id ? `/products/${draft.slug}` : '保存后生成作品页面'}
          </div>
        </div>
        <div className="flex-1" />
        {draft.id > 0 && draft.slug && (
          <Link href={`/products/${draft.slug}`} target="_blank">
            <Button icon={<EyeOutlined />}>预览</Button>
          </Link>
        )}
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>
          保存
        </Button>
      </div>

      <div className="mx-auto max-w-[1120px] space-y-5 p-4 pb-16 sm:p-7 sm:pb-20">
        <EditorSection title="基本信息" description="设置作品地址、状态和在作品集中的展示方式。">
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <div className="mb-1 text-sm text-[#666]">作品名称 *</div>
              <Input value={draft.name} onChange={(e) => update({ name: e.target.value })} />
            </label>
            <label>
              <div className="mb-1 text-sm text-[#666]">作品地址 *</div>
              <div className="flex">
                <span className="flex items-center rounded-l-md border border-r-0 border-[#d9d9d9] bg-[#fafafa] px-3 text-[#666]">
                  /products/
                </span>
                <Input
                  className="rounded-l-none"
                  value={draft.slug}
                  placeholder="rumy"
                  onChange={(e) => update({ slug: e.target.value.toLowerCase() })}
                />
              </div>
            </label>
            <label>
              <div className="mb-1 text-sm text-[#666]">平台</div>
              <Input value={draft.platform || ''} placeholder="Chrome 扩展" onChange={(e) => update({ platform: e.target.value })} />
            </label>
            <label>
              <div className="mb-1 text-sm text-[#666]">版本</div>
              <Input value={draft.version || ''} placeholder="0.1.0" onChange={(e) => update({ version: e.target.value })} />
            </label>
            <label>
              <div className="mb-1 text-sm text-[#666]">作品状态</div>
              <Select
                className="w-full"
                value={draft.status}
                onChange={(status) => update({ status })}
                options={[
                  { value: 'developing', label: '开发中' },
                  { value: 'testing', label: '测试中' },
                  { value: 'released', label: '已发布' },
                  { value: 'paused', label: '暂停维护' },
                ]}
              />
            </label>
            <label>
              <div className="mb-1 text-sm text-[#666]">状态文案</div>
              <Input value={draft.statusLabel || ''} onChange={(e) => update({ statusLabel: e.target.value })} />
            </label>
            <label>
              <div className="mb-1 text-sm text-[#666]">品牌色</div>
              <Input value={draft.accentColor} placeholder="#2d8cf0" onChange={(e) => update({ accentColor: e.target.value })} />
            </label>
            <label>
              <div className="mb-1 text-sm text-[#666]">展示排序</div>
              <InputNumber className="w-full" value={draft.sort} onChange={(value) => update({ sort: value || 0 })} />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-8 border-t border-[#edf0f4] pt-5">
            <label className="flex items-center gap-2">
              <Switch checked={draft.published} onChange={(published) => update({ published })} />
              发布到作品集
            </label>
            <label className="flex items-center gap-2">
              <Switch checked={draft.featured} onChange={(featured) => update({ featured })} />
              重点展示
            </label>
          </div>
        </EditorSection>

        <EditorSection title="主视觉与介绍" description="这些内容用于作品集卡片和详情页首屏。">
          <div className="grid gap-5 sm:grid-cols-[140px_1fr]">
            <div>
              <div className="mb-1 text-sm text-[#666]">作品 Logo</div>
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={(file) => {
                  upload(file, 'logoUrl')
                  return false
                }}
              >
                <button type="button" className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#d9d9d9] bg-white">
                  {draft.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={draft.logoUrl} alt="Logo" className="h-full w-full object-cover" />
                  ) : uploading === 'logoUrl' ? <LoadingOutlined /> : <PlusOutlined />}
                </button>
              </Upload>
            </div>
            <div className="space-y-4">
              <label className="block">
                <div className="mb-1 text-sm text-[#666]">一句话定位</div>
                <Input value={draft.tagline || ''} placeholder="你的 Web 自定义助手" onChange={(e) => update({ tagline: e.target.value })} />
              </label>
              <label className="block">
                <div className="mb-1 text-sm text-[#666]">作品简介</div>
                <Input.TextArea rows={3} value={draft.summary || ''} onChange={(e) => update({ summary: e.target.value })} />
              </label>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-1 text-sm text-[#666]">作品封面</div>
            <Upload
              accept="image/*"
              showUploadList={false}
              className="block"
              beforeUpload={(file) => {
                upload(file, 'coverUrl')
                return false
              }}
            >
              <button type="button" className="flex min-h-44 w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-[#d9d9d9] bg-[#fafafa]">
                {draft.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft.coverUrl} alt="作品封面" className="max-h-[420px] w-full object-contain" />
                ) : uploading === 'coverUrl' ? <LoadingOutlined /> : <span><UploadOutlined /> 上传作品封面</span>}
              </button>
            </Upload>
          </div>

          <div className="mt-5">
            <div className="mb-1 text-sm text-[#666]">亮点标签</div>
            <Keywords
              value={draft.highlights.join(',')}
              placeholder="输入亮点后按回车"
              onChange={(value) => update({ highlights: value.split(',').filter(Boolean) })}
            />
          </div>
        </EditorSection>

        <EditorSection title="主视觉按钮" description="显示在作品详情页首屏，可配置官网、商店或代码仓库。">
          <div className="space-y-3">
            {draft.links.map((link, index) => (
              <div key={index} className="grid items-center gap-2 rounded border border-[#edf0f4] p-3 sm:grid-cols-[150px_minmax(0,1fr)_150px_100px_auto]">
                <Input value={link.label} placeholder="按钮名称" onChange={(e) => updateLink(index, { label: e.target.value })} />
                <Input value={link.url} placeholder="https://" onChange={(e) => updateLink(index, { url: e.target.value })} />
                <Input value={link.analyticsKey} placeholder="统计标识，如 store" onChange={(e) => updateLink(index, { analyticsKey: e.target.value.trim().replace(/[^a-zA-Z0-9_-]/g, '') })} />
                <div className="flex h-8 items-center px-2">
                  <Checkbox className="flex items-center" checked={link.primary} onChange={(e) => updateLink(index, { primary: e.target.checked })}>
                    主按钮
                  </Checkbox>
                </div>
                <Button danger icon={<DeleteOutlined />} onClick={() => update({ links: draft.links.filter((_, i) => i !== index) })} />
              </div>
            ))}
            <Button type="dashed" block icon={<PlusOutlined />} onClick={() => update({ links: [...draft.links, { label: '', url: '', primary: false, analyticsKey: '' }] })}>
              添加按钮
            </Button>
          </div>
        </EditorSection>

        <EditorSection title="详情模块" description="自由组合页面内容，支持修改标题、布局、显示状态和顺序。">
          <ProductSectionEditor
            sections={draft.sections}
            onChange={(sections) => update({ sections })}
          />
        </EditorSection>
      </div>
    </div>
  )
}
