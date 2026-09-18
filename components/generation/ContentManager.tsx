'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { Alert, Button, Form, Input, Popconfirm, Radio, Select, Spin, Table, Tabs, Tag, message } from 'antd'
import { apiFetch } from '@/lib/api/client'
import { managedContentDetailSchema, managedContentListSchema, type ManagedContentDetail } from '@/lib/schemas/generation'
import { aiDigestDetailSchema } from '@/lib/schemas/ai-digest'
import DigestArticle from '@/components/ai-digest/DigestArticle'
import { formatTime, statusText } from '@/components/ai-digest/DigestShared'
import styles from './Generation.module.css'

const errorText = (error: unknown) => error instanceof Error ? error.message : '操作失败'

export default function ContentManager({ id }: { id?: number }) {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string | undefined>()
  const list = useSWR(id ? null : ['/generated-contents/', page, status], ([path, current, filter]) => apiFetch(path, { params: { page: current, status: filter }, schema: managedContentListSchema }))
  const detail = useSWR(id ? `/generated-contents/${id}/` : null, path => apiFetch(path, { schema: managedContentDetailSchema }), { revalidateOnFocus: false })
  if (id) {
    if (detail.error) return <div className={styles.page}><Alert type="error" message={errorText(detail.error)} action={<Button onClick={() => void detail.mutate()}>重试</Button>} /></div>
    return detail.data ? <ContentEditor detail={detail.data} onSaved={value => { void detail.mutate(value, false) }} /> : <div className={styles.page}><Spin /></div>
  }
  return <div className={styles.page}>
    <header className={styles.header}><div><h1>内容管理</h1><p>管理生成结果与修订，预览、编辑、发布和撤回。</p></div><Link href="/manage/generation">生成管理</Link></header>
    {list.error && <Alert className={styles.alert} type="error" message={errorText(list.error)} action={<Button onClick={() => void list.mutate()}>重新加载</Button>} />}
    <Select aria-label="按发布状态筛选" value={status} allowClear placeholder="全部状态" style={{ minWidth: 160, marginBottom: 20 }} onChange={value => { setStatus(value); setPage(1) }} options={Object.entries(statusText).map(([value, label]) => ({ value, label }))} />
    <div className={styles.table}><Table rowKey="id" loading={list.isLoading} dataSource={list.data?.list} pagination={{ current: page, pageSize: 20, total: list.data?.total, showSizeChanger: false, onChange: setPage }} columns={[
      { title: '内容', render: (_, row) => <div className={styles.sourceTitle}><Link href={`/manage/content/${row.id}`}><strong>{row.title}</strong></Link><p className={styles.muted}>{row.summary}</p></div> },
      { title: '期次', dataIndex: 'edition' },
      { title: '阅读量', dataIndex: 'readTimes' },
      { title: '状态', render: (_, row) => <><Tag color={row.status === 'published' ? 'green' : 'blue'}>{statusText[row.status]}</Tag>{row.publishedRevision && row.currentRevision !== row.publishedRevision ? <p className={styles.muted}>有未发布修订</p> : null}</> },
      { title: '版本', render: (_, row) => `第 ${row.currentRevision} 版` },
      { title: '操作', render: (_, row) => <Link href={`/manage/content/${row.id}`}>查看 / 编辑</Link> },
    ]} /></div>
  </div>
}

type ArticleFields = {
  title: string; summary: string; takeaways: string; closing: string; coverAlt: string;
  sections: { title: string; paragraphs: string; analysis: string; groupId?: 'applications' | 'development' }[];
}

function ContentEditor({ detail, onSaved }: { detail: ManagedContentDetail; onSaved: (value: ManagedContentDetail) => void }) {
  const [form] = Form.useForm<ArticleFields>()
  const [messages, contextHolder] = message.useMessage()
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [tab, setTab] = useState('preview')
  useEffect(() => {
    const content = detail.document.content
    form.setFieldsValue({ title: detail.title, summary: detail.summary, takeaways: content.takeaways.join('\n'), closing: content.closing,
      coverAlt: content.cover.alt, sections: content.sections.map(section => ({ title: section.title, groupId: section.groupId, paragraphs: section.paragraphs.join('\n\n'), analysis: section.analysis })) })
    setDirty(false)
  }, [detail, form])
  useEffect(() => {
    if (!dirty) return
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [dirty])
  async function save(values: ArticleFields) {
    setBusy(true)
    try {
      const content = { ...detail.document.content, takeaways: values.takeaways.split('\n').map(s => s.trim()).filter(Boolean), closing: values.closing,
        cover: { ...detail.document.content.cover, alt: values.coverAlt },
        sections: detail.document.content.sections.map((section, index) => ({ ...section, ...values.sections[index], paragraphs: values.sections[index].paragraphs.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean) })),
      }
      const result = await apiFetch(`/generated-contents/${detail.id}/`, { method: 'PUT', schema: managedContentDetailSchema,
        data: { expectedRevision: detail.currentRevision, title: values.title, summary: values.summary, content } })
      onSaved(result); setTab('preview'); messages.success('已保存新修订')
    } catch (error) { messages.error(errorText(error)) } finally { setBusy(false) }
  }
  async function action(value: 'publish' | 'withdraw') {
    setBusy(true)
    try {
      const result = await apiFetch(`/generated-contents/${detail.id}/`, { method: 'POST', data: { action: value, expectedRevision: detail.currentRevision }, schema: managedContentDetailSchema })
      onSaved(result); messages.success(value === 'publish' ? '已发布当前版本' : '已撤回')
    } catch (error) { messages.error(errorText(error)) } finally { setBusy(false) }
  }
  const preview = aiDigestDetailSchema.parse({
    id: detail.legacyDigestId || detail.id, issueDate: detail.edition, title: detail.title, channelTitle: detail.channelTitle, slug: detail.edition,
    summary: detail.summary, status: detail.status, timezone: 'Asia/Shanghai', cover: detail.cover, readTimes: detail.readTimes,
    scheduledPublishAt: detail.scheduledPublishAt, publishedAt: detail.publishedAt, createdAt: detail.createdAt,
    updatedAt: detail.updatedAt, contentVersion: detail.currentRevision, content: detail.document.content,
  })
  return <div className={styles.page}>
    {contextHolder}
    <header className={styles.header}><div><Link href="/manage/content">← 内容管理</Link><h1 style={{ marginTop: 12 }}>{detail.title}</h1><p><Tag>{statusText[detail.status]}</Tag>第 {detail.currentRevision} 版 · 计划发布 {formatTime(detail.scheduledPublishAt)}</p></div><div className={styles.actions}>
      {detail.legacyDigestId && detail.status === 'published' && <Link href={`/ai-news/${detail.legacyDigestId}`} target="_blank">查看线上内容</Link>}
      <Popconfirm title="发布当前保存的修订？" description="网站将展示这一版内容。" onConfirm={() => action('publish')} disabled={busy || dirty}><Button type="primary" loading={busy} disabled={dirty || (detail.status === 'published' && detail.publishedRevision === detail.currentRevision)}>发布当前版本</Button></Popconfirm>
      {detail.status === 'published' && <Popconfirm title="从网站撤回此内容？" onConfirm={() => action('withdraw')}><Button danger disabled={busy}>撤回</Button></Popconfirm>}
    </div></header>
    {dirty && <Alert className={styles.alert} type="info" message="有尚未保存的修改，请先保存再预览或发布。" />}
    {detail.publishedRevision && detail.publishedRevision !== detail.currentRevision ? <Alert className={styles.alert} type="info" message={`当前预览第 ${detail.currentRevision} 版，线上仍展示第 ${detail.publishedRevision} 版。`} /> : null}
    <Tabs activeKey={tab} onChange={setTab} items={[
      { key: 'preview', label: '预览', children: <DigestArticle detail={preview} manage manageArchivePath="/manage/content" /> },
      { key: 'edit', label: '编辑内容', forceRender: true, children: <Form className={`${styles.form} ${styles.editor}`} form={form} layout="vertical" onFinish={save} onValuesChange={() => setDirty(true)}>
        <Form.Item name="title" label="标题" rules={[{ required: true, max: 255 }]}><Input /></Form.Item><Form.Item name="summary" label="摘要" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
        <img className={styles.cover} src={detail.document.content.cover.url} alt={detail.document.content.cover.alt} />
        <Form.Item name="coverAlt" label="封面说明" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="takeaways" label="本期速览（每行一条）" rules={[{ required: true }]}><Input.TextArea rows={4} /></Form.Item>
        {detail.document.content.sections.map((section, index) => <section className={styles.section} key={section.id}><h2>内容块 {index + 1}</h2>{detail.document.content.groups && <Form.Item name={['sections', index, 'groupId']} label="所属分区" rules={[{ required: true }]}><Radio.Group options={detail.document.content.groups.map(group => ({ value: group.id, label: group.title }))} /></Form.Item>}<Form.Item name={['sections', index, 'title']} label="小标题" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name={['sections', index, 'paragraphs']} label="正文（段落之间留一空行）" rules={[{ required: true }]}><Input.TextArea rows={8} /></Form.Item><Form.Item name={['sections', index, 'analysis']} label="AI 简评（可选）"><Input.TextArea rows={3} /></Form.Item><p className={styles.muted}>引用来源：{section.sources.map(s => s.publisher).join('、')}</p></section>)}
        <Form.Item name="closing" label="结语" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item><div className={styles.formFooter}><Button htmlType="submit" type="primary" loading={busy}>保存为新修订</Button></div>
      </Form> },
      { key: 'sources', label: '原始资料', children: <><p className={styles.muted}>采集窗口：{formatTime(detail.document.sourceWindowStart)} — {formatTime(detail.document.sourceWindowEnd)}</p>{detail.document.sources.map((source, index) => <pre className={styles.details} key={index}>{JSON.stringify(source, null, 2)}</pre>)}</> },
      { key: 'revisions', label: '修订记录', children: <Table rowKey="revision" dataSource={detail.revisions} pagination={false} columns={[
        { title: '版本', dataIndex: 'revision' }, { title: '作者类型', render: (_, row) => ({ ai: 'AI 生成', human: '人工编辑', import: '历史导入', migration: '结构升级' })[row.origin] || row.origin },
        { title: '时间', render: (_, row) => formatTime(row.createdAt) }, { title: '生成记录', render: (_, row) => row.jobId ? <Link href={`/manage/generation?job=${row.jobId}`}>查看执行尝试 #{row.runId}</Link> : '—' },
      ]} /> },
    ]} />
  </div>
}
