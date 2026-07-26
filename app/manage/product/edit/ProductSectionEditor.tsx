'use client'

import { App, Button, Checkbox, Dropdown, Input, Select, Switch, Upload } from 'antd'
import {
  CopyOutlined,
  DeleteOutlined,
  DownOutlined,
  HolderOutlined,
  PlusOutlined,
  UpOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import { useState } from 'react'
import TiptapEditor from '@/components/TiptapEditor'
import { uploadToQiniu } from '@/lib/upload'
import type {
  ProductFeature,
  ProductLink,
  ProductScreenshot,
  ProductSection,
  ProductStep,
} from '@/lib/schemas/product'

interface Props {
  sections: ProductSection[]
  onChange: (sections: ProductSection[]) => void
}

const SECTION_DEFINITIONS = {
  feature_grid: {
    label: '功能卡片',
    title: '核心能力',
    subtitle: 'CAPABILITIES',
    layout: 'columns-2',
    content: { items: [] },
  },
  steps: {
    label: '操作步骤',
    title: '如何使用',
    subtitle: '',
    layout: 'columns-3',
    content: { items: [] },
  },
  gallery: {
    label: '媒体画廊',
    title: '作品展示',
    subtitle: 'MEDIA',
    layout: 'carousel',
    content: { items: [] },
  },
  rich_text: {
    label: '富文本',
    title: '作品介绍',
    subtitle: '',
    layout: 'default',
    content: { html: '' },
  },
  image_text: {
    label: '图文介绍',
    title: '作品亮点',
    subtitle: '',
    layout: 'image-left',
    content: { imageUrl: '', imageAlt: '', html: '' },
  },
  links: {
    label: '链接按钮',
    title: '相关链接',
    subtitle: '',
    layout: 'default',
    content: { items: [] },
  },
  callout: {
    label: '提示信息',
    title: '',
    subtitle: '',
    layout: 'default',
    content: { text: '' },
  },
} as const

type SectionType = keyof typeof SECTION_DEFINITIONS

function normalize(sections: ProductSection[]) {
  return sections.map((section, index) => ({ ...section, sort: index }))
}

function sectionItems<T>(section: ProductSection): T[] {
  return Array.isArray(section.content.items) ? (section.content.items as T[]) : []
}

function layoutOptions(type: string) {
  if (type === 'feature_grid' || type === 'steps') {
    return [
      { value: 'columns-1', label: '单列' },
      { value: 'columns-2', label: '两列' },
      { value: 'columns-3', label: '三列' },
      { value: 'columns-4', label: '四列' },
    ]
  }
  if (type === 'image_text') {
    return [
      { value: 'image-left', label: '图片在左' },
      { value: 'image-right', label: '图片在右' },
    ]
  }
  return [{ value: 'default', label: '默认布局' }]
}

export default function ProductSectionEditor({ sections, onChange }: Props) {
  const { message } = App.useApp()
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [uploadingKey, setUploadingKey] = useState('')
  const [videoUrlDrafts, setVideoUrlDrafts] = useState<Record<string, string>>({})

  const commit = (next: ProductSection[]) => onChange(normalize(next))

  const updateSection = (index: number, patch: Partial<ProductSection>) => {
    commit(sections.map((section, i) => (i === index ? { ...section, ...patch } : section)))
  }

  const updateContent = (index: number, patch: Record<string, unknown>) => {
    const section = sections[index]
    updateSection(index, { content: { ...section.content, ...patch } })
  }

  const addSection = (type: SectionType) => {
    const definition = SECTION_DEFINITIONS[type]
    const id = -Date.now()
    commit([
      ...sections,
      {
        id,
        productId: null,
        type,
        title: definition.title,
        subtitle: definition.subtitle,
        layout: definition.layout,
        content: JSON.parse(JSON.stringify(definition.content)) as Record<string, unknown>,
        visible: true,
        sort: sections.length,
        createdAt: null,
        updatedAt: null,
      },
    ])
    window.setTimeout(() => {
      document
        .getElementById(`product-section-${id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= sections.length || from === to) return
    const next = [...sections]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    commit(next)
  }

  const duplicate = (index: number) => {
    const source = sections[index]
    const copy: ProductSection = {
      ...source,
      id: -Date.now(),
      title: source.title ? `${source.title} 副本` : '',
      content: JSON.parse(JSON.stringify(source.content)) as Record<string, unknown>,
      sort: index + 1,
    }
    const next = [...sections]
    next.splice(index + 1, 0, copy)
    commit(next)
  }

  const uploadFile = async (file: File, key: string) => {
    setUploadingKey(key)
    try {
      return await uploadToQiniu(file)
    } catch {
      message.error('文件上传失败')
      return ''
    } finally {
      setUploadingKey('')
    }
  }

  const renderFeatureEditor = (section: ProductSection, sectionIndex: number) => {
    const items = sectionItems<ProductFeature>(section)
    return (
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="grid gap-2 rounded border border-[#edf0f4] p-3 sm:grid-cols-[220px_1fr_auto]">
            <Input
              value={item.title}
              placeholder="功能名称"
              onChange={(event) => {
                const next = items.map((value, i) => i === index ? { ...value, title: event.target.value } : value)
                updateContent(sectionIndex, { items: next })
              }}
            />
            <Input
              value={item.description}
              placeholder="功能说明"
              onChange={(event) => {
                const next = items.map((value, i) => i === index ? { ...value, description: event.target.value } : value)
                updateContent(sectionIndex, { items: next })
              }}
            />
            <Button danger icon={<DeleteOutlined />} onClick={() => updateContent(sectionIndex, { items: items.filter((_, i) => i !== index) })} />
          </div>
        ))}
        <Button type="dashed" block icon={<PlusOutlined />} onClick={() => updateContent(sectionIndex, { items: [...items, { title: '', description: '' }] })}>
          添加功能卡片
        </Button>
      </div>
    )
  }

  const renderStepEditor = (section: ProductSection, sectionIndex: number) => {
    const items = sectionItems<ProductStep>(section)
    return (
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="grid gap-2 rounded border border-[#edf0f4] p-3 sm:grid-cols-[220px_1fr_auto]">
            <Input
              value={item.title}
              placeholder="步骤名称"
              onChange={(event) => {
                const next = items.map((value, i) => i === index ? { ...value, title: event.target.value } : value)
                updateContent(sectionIndex, { items: next })
              }}
            />
            <Input
              value={item.description}
              placeholder="步骤说明"
              onChange={(event) => {
                const next = items.map((value, i) => i === index ? { ...value, description: event.target.value } : value)
                updateContent(sectionIndex, { items: next })
              }}
            />
            <Button danger icon={<DeleteOutlined />} onClick={() => updateContent(sectionIndex, { items: items.filter((_, i) => i !== index) })} />
          </div>
        ))}
        <Button type="dashed" block icon={<PlusOutlined />} onClick={() => updateContent(sectionIndex, { items: [...items, { title: '', description: '' }] })}>
          添加步骤
        </Button>
      </div>
    )
  }

  const renderGalleryEditor = (section: ProductSection, sectionIndex: number) => {
    const items = sectionItems<ProductScreenshot>(section)
    const draftKey = String(section.id || sectionIndex)
    const addVideoUrl = () => {
      const url = (videoUrlDrafts[draftKey] || '').trim()
      if (!url) return
      try {
        const parsed = new URL(url)
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid protocol')
      } catch {
        message.info('请输入有效的视频地址')
        return
      }
      updateContent(sectionIndex, {
        items: [...items, { type: 'video', url, alt: '', caption: '', poster: '' }],
      })
      setVideoUrlDrafts((value) => ({ ...value, [draftKey]: '' }))
    }
    return (
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={`${item.url}-${index}`} className="grid gap-3 rounded border border-[#edf0f4] p-3 sm:grid-cols-[180px_1fr_auto]">
            {(item.type || 'image') === 'video' ? (
              <div className="flex h-28 w-full flex-col items-center justify-center rounded bg-[#111827] text-white">
                <span className="text-3xl" aria-hidden="true">▶</span>
                <span className="mt-1 text-xs text-white/70">视频</span>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.url} alt="" className="h-28 w-full rounded object-cover" />
            )}
            <div className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-[110px_1fr]">
                <Select
                  value={item.type || 'image'}
                  options={[
                    { value: 'image', label: '图片' },
                    { value: 'video', label: '视频' },
                  ]}
                  onChange={(type) => updateContent(sectionIndex, {
                    items: items.map((value, i) => i === index ? { ...value, type } : value),
                  })}
                />
                <Input
                  value={item.url}
                  placeholder="媒体地址"
                  onChange={(event) => updateContent(sectionIndex, {
                    items: items.map((value, i) => i === index ? { ...value, url: event.target.value } : value),
                  })}
                />
              </div>
              <Input
                value={item.alt}
                placeholder="媒体说明（SEO）"
                onChange={(event) => updateContent(sectionIndex, {
                  items: items.map((value, i) => i === index ? { ...value, alt: event.target.value } : value),
                })}
              />
              <Input
                value={item.caption}
                placeholder="展示文案"
                onChange={(event) => updateContent(sectionIndex, {
                  items: items.map((value, i) => i === index ? { ...value, caption: event.target.value } : value),
                })}
              />
            </div>
            <Button danger icon={<DeleteOutlined />} onClick={() => updateContent(sectionIndex, { items: items.filter((_, i) => i !== index) })} />
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-2">
          <Upload
            accept="image/*"
            showUploadList={false}
            beforeUpload={(file) => {
              uploadFile(file, `gallery-image-${section.id}`).then((url) => {
                if (url) updateContent(sectionIndex, {
                  items: [...items, { type: 'image', url, alt: '', caption: '', poster: '' }],
                })
              })
              return false
            }}
          >
            <Button loading={uploadingKey === `gallery-image-${section.id}`} icon={<UploadOutlined />}>
              上传图片
            </Button>
          </Upload>
          <Upload
            accept="video/mp4,video/webm,video/ogg"
            showUploadList={false}
            beforeUpload={(file) => {
              uploadFile(file, `gallery-video-${section.id}`).then((url) => {
                if (url) updateContent(sectionIndex, {
                  items: [...items, { type: 'video', url, alt: '', caption: '', poster: '' }],
                })
              })
              return false
            }}
          >
            <Button loading={uploadingKey === `gallery-video-${section.id}`} icon={<UploadOutlined />}>
              上传录屏
            </Button>
          </Upload>
          <Input.Search
            className="min-w-[280px] flex-1"
            value={videoUrlDrafts[draftKey] || ''}
            placeholder="粘贴 MP4、YouTube 或 Bilibili 视频链接"
            enterButton="添加视频"
            onChange={(event) => setVideoUrlDrafts((value) => ({ ...value, [draftKey]: event.target.value }))}
            onSearch={addVideoUrl}
          />
        </div>
      </div>
    )
  }

  const renderLinkEditor = (section: ProductSection, sectionIndex: number) => {
    const items = sectionItems<ProductLink>(section)
    return (
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="grid items-center gap-2 rounded border border-[#edf0f4] p-3 sm:grid-cols-[160px_minmax(0,1fr)_110px_auto]">
            <Input value={item.label} placeholder="按钮名称" onChange={(event) => updateContent(sectionIndex, {
              items: items.map((value, i) => i === index ? { ...value, label: event.target.value } : value),
            })} />
            <Input value={item.url} placeholder="https://" onChange={(event) => updateContent(sectionIndex, {
              items: items.map((value, i) => i === index ? { ...value, url: event.target.value } : value),
            })} />
            <div className="flex h-8 items-center px-2">
              <Checkbox className="flex items-center" checked={item.primary} onChange={(event) => updateContent(sectionIndex, {
                items: items.map((value, i) => i === index ? { ...value, primary: event.target.checked } : value),
              })}>主按钮</Checkbox>
            </div>
            <Button danger icon={<DeleteOutlined />} onClick={() => updateContent(sectionIndex, { items: items.filter((_, i) => i !== index) })} />
          </div>
        ))}
        <Button type="dashed" block icon={<PlusOutlined />} onClick={() => updateContent(sectionIndex, { items: [...items, { label: '', url: '', primary: false }] })}>
          添加链接
        </Button>
      </div>
    )
  }

  const renderContentEditor = (section: ProductSection, index: number) => {
    if (section.type === 'feature_grid') return renderFeatureEditor(section, index)
    if (section.type === 'steps') return renderStepEditor(section, index)
    if (section.type === 'gallery') return renderGalleryEditor(section, index)
    if (section.type === 'links') return renderLinkEditor(section, index)
    if (section.type === 'rich_text') {
      const html = typeof section.content.html === 'string' ? section.content.html : ''
      return (
        <div className="h-[360px]">
          <TiptapEditor value={html} onChange={(value) => updateContent(index, { html: value })} />
        </div>
      )
    }
    if (section.type === 'image_text') {
      const imageUrl = typeof section.content.imageUrl === 'string' ? section.content.imageUrl : ''
      const imageAlt = typeof section.content.imageAlt === 'string' ? section.content.imageAlt : ''
      const html = typeof section.content.html === 'string' ? section.content.html : ''
      return (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
            <Upload
              accept="image/*"
              showUploadList={false}
              beforeUpload={(file) => {
                uploadFile(file, `image-text-${section.id}`).then((url) => {
                  if (url) updateContent(index, { imageUrl: url })
                })
                return false
              }}
            >
              <button type="button" className="flex h-32 w-44 items-center justify-center overflow-hidden rounded border border-dashed border-[#d9d9d9] bg-[#fafafa]">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                ) : uploadingKey === `image-text-${section.id}` ? '上传中…' : <><UploadOutlined /> 上传图片</>}
              </button>
            </Upload>
            <Input value={imageAlt} placeholder="图片说明" onChange={(event) => updateContent(index, { imageAlt: event.target.value })} />
          </div>
          <div className="h-[320px]">
            <TiptapEditor value={html} onChange={(value) => updateContent(index, { html: value })} />
          </div>
        </div>
      )
    }
    if (section.type === 'callout') {
      const text = typeof section.content.text === 'string' ? section.content.text : ''
      return <Input.TextArea rows={4} value={text} placeholder="输入需要强调的内容" onChange={(event) => updateContent(index, { text: event.target.value })} />
    }
    return null
  }

  return (
    <div>
      <div className="mb-4 text-sm text-[#888]">
        拖动模块调整顺序；标题、副标题和布局都可以单独设置。
      </div>
      <div className="fixed bottom-6 right-6 z-30">
        <Dropdown
          trigger={['click']}
          menu={{
            items: Object.entries(SECTION_DEFINITIONS).map(([key, value]) => ({ key, label: value.label })),
            onClick: ({ key }) => addSection(key as SectionType),
          }}
        >
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            className="cursor-pointer rounded-full shadow-[0_8px_24px_rgba(45,140,240,0.35)] hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(45,140,240,0.42)] active:translate-y-0"
          >
            添加模块
          </Button>
        </Dropdown>
      </div>

      {sections.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#d9d9d9] px-6 py-14 text-center text-[#999]">
          暂无详情模块，点击“添加模块”开始搭建作品页面。
        </div>
      ) : (
        <div className="space-y-4">
          {sections.map((section, index) => {
            const definition = SECTION_DEFINITIONS[section.type as SectionType]
            return (
              <article
                key={section.id || `${section.type}-${index}`}
                id={`product-section-${section.id || index}`}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null) move(dragIndex, index)
                  setDragIndex(null)
                }}
                onDragEnd={() => setDragIndex(null)}
                className={`overflow-hidden rounded-lg border bg-white transition ${
                  dragIndex === index ? 'border-[#409eff] opacity-60' : 'border-[#dde2e8]'
                }`}
              >
                <div className="flex items-center gap-3 border-b border-[#edf0f4] bg-[#fafbfc] px-3 py-3">
                  <HolderOutlined className="cursor-grab text-lg text-[#98a2b3] active:cursor-grabbing" />
                  <span className="flex h-6 min-w-6 items-center justify-center rounded bg-[#edf4ff] px-1.5 text-xs font-bold text-[#2d8cf0]">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-[#333]">{section.title || definition?.label || section.type}</div>
                    <div className="text-xs text-[#999]">{definition?.label || section.type}</div>
                  </div>
                  <label className="flex items-center gap-1.5 text-sm text-[#666]">
                    <Switch size="small" checked={section.visible} onChange={(visible) => updateSection(index, { visible })} />
                    显示
                  </label>
                  <Button size="small" icon={<UpOutlined />} disabled={index === 0} onClick={() => move(index, index - 1)} />
                  <Button size="small" icon={<DownOutlined />} disabled={index === sections.length - 1} onClick={() => move(index, index + 1)} />
                  <Button size="small" icon={<CopyOutlined />} onClick={() => duplicate(index)} />
                  <Button size="small" danger icon={<DeleteOutlined />} onClick={() => commit(sections.filter((_, i) => i !== index))} />
                </div>

                <div className="p-4 sm:p-5">
                  <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_1fr_180px]">
                    <label>
                      <div className="mb-1 text-xs text-[#888]">模块标题</div>
                      <Input value={section.title || ''} placeholder="可留空" onChange={(event) => updateSection(index, { title: event.target.value })} />
                    </label>
                    <label>
                      <div className="mb-1 text-xs text-[#888]">小标题</div>
                      <Input value={section.subtitle || ''} placeholder="例如 FEATURES" onChange={(event) => updateSection(index, { subtitle: event.target.value })} />
                    </label>
                    <label>
                      <div className="mb-1 text-xs text-[#888]">布局</div>
                      <Select className="w-full" value={section.layout} options={layoutOptions(section.type)} onChange={(layout) => updateSection(index, { layout })} />
                    </label>
                  </div>
                  {renderContentEditor(section, index)}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
