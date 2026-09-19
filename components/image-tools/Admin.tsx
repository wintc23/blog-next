'use client'

import { useEffect, useState } from 'react'
import { Alert, App, Button, Card, Col, Divider, Drawer, Empty, Form, Input, InputNumber, Row, Select, Space, Spin, Switch, Table, Tabs, Tag, Upload } from 'antd'
import { PlusOutlined, ReloadOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons'
import { z } from 'zod'
import { apiFetch } from '@/lib/api/client'
import { ToolsResult, type Tool, labels, ratioLabels, toolCover } from '@/lib/image-tools'
import { uploadImage } from '@/lib/upload'
import AdminJobDetails from './AdminJobDetails'
import styles from './Admin.module.css'

const limitsSchema = z.object({ version: z.number(), globalPerMinute: z.number(), userPerHour: z.number(), uploadMaxMb: z.number(), uploadMaxMegapixels: z.number(), processingMaxEdge: z.number() })
const jobsSchema = z.object({ total: z.number(), page: z.number(), perPage: z.number(), model: z.string(), limits: limitsSchema, jobs: z.array(z.object({ id: z.string(), ownerId: z.number(), ownerName: z.string(), name: z.string(), status: z.string(), createdAt: z.string() })) })
const blank = { slug: '', enabled: false, position: 0, version: 0, config: { name: '', description: '', instruction: '', coverUrl: '', mode: 'per_image' as const, minImages: 1, maxImages: 10, maxOutputs: 4, defaultCount: 1, ratios: ['auto', '1:1', '3:2', '2:3'], defaultRatio: 'auto', comparison: false, promptRequired: false, fields: [] } }

export default function Admin() {
  const [jobId, setJobId] = useState<string | null>(null), [jobsLoading, setJobsLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [tools, setTools] = useState<Tool[]>([])
  const [current, setCurrent] = useState<Tool | null>(null)
  const [jobs, setJobs] = useState<z.infer<typeof jobsSchema> | null>(null)
  const [error, setError] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [uploading, setUploading] = useState(false)
  const [ready, setReady] = useState(false), [open, setOpen] = useState(false), [dirty, setDirty] = useState(false)
  const [form] = Form.useForm(), [limitForm] = Form.useForm()
  const mode = Form.useWatch(['config', 'mode'], form)
  const cover = Form.useWatch(['config', 'coverUrl'], form)
  const { message, modal } = App.useApp()
  const read = async () => {
    setLoading(true)
    try {
      const [result, history] = await Promise.all([apiFetch('/image-tools/admin/templates/', { schema: ToolsResult }), apiFetch('/image-tools/admin/jobs/', { schema: jobsSchema })])
      setTools(result.tools); setReady(result.ready); setJobs(history); limitForm.setFieldsValue(history.limits); setError('')
    } catch (error) { setError(error instanceof Error ? error.message : '加载失败') }
    finally { setLoading(false) }
  }
  useEffect(() => { setMounted(true); void read() }, [])
  const readJobs = async (page: number) => {
    setJobsLoading(true)
    try { setJobs(await apiFetch('/image-tools/admin/jobs/', { params: { page }, schema: jobsSchema })) }
    catch (error) { message.error(error instanceof Error ? error.message : '加载任务失败') }
    finally { setJobsLoading(false) }
  }
  const edit = (tool: Tool | null) => {
    setCurrent(tool); form.resetFields(); form.setFieldsValue(tool || blank); setDirty(false); setOpen(true)
  }
  const close = () => {
    if (busy || uploading) return
    if (dirty) modal.confirm({ title: '放弃未保存的修改？', okText: '放弃修改', cancelText: '继续编辑', onOk: () => setOpen(false) })
    else setOpen(false)
  }
  const save = async (values: typeof blank) => {
    setBusy(true)
    try {
      await apiFetch('/image-tools/admin/templates/', { method: 'POST', data: { ...values, version: current?.version, config: { ...values.config, ratios: [values.config.defaultRatio], maxOutputs: 4, defaultCount: values.config.mode === 'per_image' ? 1 : values.config.defaultCount } }, schema: z.object({ tool: ToolsResult.shape.tools.element }) })
      message.success('已保存新版本'); setDirty(false); setOpen(false); await read()
    } catch (error) { message.error(error instanceof Error ? error.message : '保存失败') }
    finally { setBusy(false) }
  }
  if (!mounted) return <div className={styles.page}><Spin aria-label="加载生图管理" /></div>
  return <div className={styles.page}>
    <div className={styles.header}><div><h1>生图管理</h1><p>管理工具封面、生成规则与发布状态。前台只保留输入和结果。</p></div><Space><Button icon={<ReloadOutlined />} onClick={() => void read()} loading={loading}>刷新</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => edit(null)}>新建模板</Button></Space></div>
    {error && <Alert type="error" showIcon message={error} action={<Button onClick={() => void read()}>重试</Button>} />}
    <div className={styles.summary}>
      <Card size="small"><span>已发布工具</span><strong>{tools.filter(tool => tool.enabled).length}<small> / {tools.length}</small></strong></Card>
      <Card size="small"><span>生成服务</span><strong className={styles.service}>Image 2.5 <Tag color={ready ? 'success' : 'warning'}>{ready ? '已配置' : '待配置'}</Tag></strong></Card>
      <Card size="small"><span>全站 / 每账号限额</span><strong>{jobs?.limits.globalPerMinute ?? '—'}<small> 张/分钟 · </small>{jobs?.limits.userPerHour ?? '—'}<small> 张/小时</small></strong></Card>
    </div>
    <Tabs defaultActiveKey="tools" items={[
      { key: 'tools', label: '工具模板', children: <Spin spinning={loading}>
        {!ready && !loading && <Alert className={styles.notice} showIcon type="warning" message="图片服务尚未配置，工具可以发布，但暂时不能生成。" />}
        <div className={styles.cards}>{tools.map(tool => <Card key={tool.slug} className={styles.toolCard} cover={
          // eslint-disable-next-line @next/next/no-img-element
          <img src={toolCover(tool)} alt="" />
        }><div className={styles.cardTitle}><h2>{tool.config.name}</h2><Tag color={tool.enabled ? 'blue' : 'default'}>{tool.enabled ? '已发布' : '草稿'}</Tag></div><p>{tool.config.description}</p><div className={styles.meta}><span>{tool.config.mode === 'per_image' ? '图片转换' : '文字生图'}</span><span>{ratioLabels[tool.config.defaultRatio]}</span><span>v{tool.version}</span></div><Space><Button type="primary" onClick={() => edit(tool)}>编辑模板</Button>{tool.enabled && <Button href={`/tools/${tool.slug}`} target="_blank" rel="noreferrer">打开工具</Button>}</Space></Card>)}</div>
        {!loading && !tools.length && <Empty description="还没有工具模板"><Button onClick={() => edit(null)}>创建第一个模板</Button></Empty>}
      </Spin> },
      { key: 'limits', label: '额度与图片设置', children: <Card className={styles.limits} title="额度与图片设置"><p>所有工具共用额度；批量和重试按图片张数计算。管理员不受两项限额限制。</p><Form form={limitForm} layout="vertical" onFinish={async values => {
        setBusy(true)
        try { await apiFetch('/image-tools/admin/limits/', { method: 'PUT', data: { ...values, version: jobs?.limits.version }, schema: z.object({ limits: limitsSchema }) }); message.success('配置已生效'); await read() }
        catch (error) { message.error(error instanceof Error ? error.message : '保存失败') }
        finally { setBusy(false) }
      }}><Row gutter={24}><Col xs={24} sm={12}><Form.Item name="globalPerMinute" label="全站每分钟" extra="超出后继续排队，等待执行。" rules={[{ required: true }]}><InputNumber min={1} max={10000} addonAfter="张" className={styles.full} /></Form.Item></Col><Col xs={24} sm={12}><Form.Item name="userPerHour" label="每账号每小时" extra="超出后暂停提交。游客还按同一 IP 共享此上限，批量与重试按图片张数计入。" rules={[{ required: true }]}><InputNumber min={1} max={10000} addonAfter="张" className={styles.full} /></Form.Item></Col></Row>
        <Divider orientation="left">图片上传与处理</Divider>
        <p>范围内保留原图，超过时在浏览器自动优化后上传七牛。生成使用独立处理副本，不改变已上传的原图。</p>
        <Row gutter={24}>
          <Col xs={24} sm={12}><Form.Item name="uploadMaxMb" label="单张上传大小" extra="1–100 MB。超过时自动压缩，不直接拒绝。" rules={[{ required: true }]}><InputNumber min={1} max={100} precision={0} addonAfter="MB" className={styles.full} /></Form.Item></Col>
          <Col xs={24} sm={12}><Form.Item name="uploadMaxMegapixels" label="上传像素上限" extra="1–80 百万像素。超过时保持比例缩小。" rules={[{ required: true }]}><InputNumber min={1} max={80} precision={0} addonAfter="百万像素" className={styles.full} /></Form.Item></Col>
          <Col xs={24} sm={12}><Form.Item name="processingMaxEdge" label="生成输入最长边" extra="512–4096 像素。仅处理副本；不放大小图，不降低生成结果的尺寸。" rules={[{ required: true }]}><InputNumber min={512} max={4096} precision={0} step={256} addonAfter="px" className={styles.full} /></Form.Item></Col>
        </Row><Button type="primary" htmlType="submit" loading={busy} disabled={!jobs}>保存设置</Button></Form></Card> },
      { key: 'jobs', label: '全站任务', children: <Card><Table rowKey="id" size="middle" loading={loading || jobsLoading} dataSource={jobs?.jobs || []} scroll={{ x: 760 }} pagination={{ current: jobs?.page || 1, pageSize: jobs?.perPage || 20, total: jobs?.total || 0, showSizeChanger: false, onChange: page => void readJobs(page) }} columns={[{ title: '工具', dataIndex: 'name' }, { title: '账号', dataIndex: 'ownerName', render: (name, row) => `${name} (${row.ownerId})` }, { title: '状态', dataIndex: 'status', render: value => <Tag color={value === 'completed' ? 'success' : value === 'failed' ? 'error' : 'default'}>{labels[value] || value}</Tag> }, { title: '创建时间', dataIndex: 'createdAt', render: value => new Date(value).toLocaleString() }, { title: '任务编号', dataIndex: 'id', ellipsis: true }, { title: '操作', key: 'view', fixed: 'right', width: 110, render: (_, row) => <Button type="link" onClick={() => setJobId(row.id)}>查看详情</Button> }]} /></Card> },
    ]} />
    <AdminJobDetails id={jobId} onClose={() => setJobId(null)} />
    <Drawer title={current ? `编辑 · ${current.config.name}` : '新建工具模板'} open={open} onClose={close} width={680} forceRender footer={<div className={styles.drawerFooter}><Button onClick={close} disabled={busy || uploading}>取消</Button><Button type="primary" loading={busy} disabled={uploading} onClick={() => form.submit()}>保存模板</Button></div>}>
      <Form form={form} layout="vertical" onFinish={save} onValuesChange={changed => {
        setDirty(true)
        if (changed.config?.mode) {
          const reference = changed.config.mode === 'reference'
          form.setFieldsValue({ config: { minImages: reference ? 0 : 1, maxImages: reference ? 1 : 10, defaultCount: 1, promptRequired: reference } })
        }
      }}>
        <h3>展示信息</h3>
        <div className={styles.coverEditor}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover || toolCover(current || blank)} alt="工具封面预览" />
          <div><Upload accept="image/jpeg,image/png,image/webp" showUploadList={false} beforeUpload={async file => { setUploading(true); try { form.setFieldValue(['config', 'coverUrl'], await uploadImage(file)); setDirty(true) } catch (error) { message.error(error instanceof Error ? error.message : '上传失败') } finally { setUploading(false) } return false }}><Button icon={<UploadOutlined />} loading={uploading}>上传封面</Button></Upload><p>建议横向图片，比例 3:2。支持 JPG、PNG、WebP。</p></div>
        </div>
        <Form.Item name={['config', 'coverUrl']} label="封面地址（也可直接上传）"><Input placeholder="留空使用默认封面" /></Form.Item>
        <Row gutter={16}><Col xs={24} sm={14}><Form.Item name={['config', 'name']} label="工具名称" rules={[{ required: true }]}><Input maxLength={60} /></Form.Item></Col><Col xs={24} sm={10}><Form.Item name="slug" label="地址标识" rules={[{ required: true }, { pattern: /^[a-z][a-z0-9-]{0,63}$/, message: '小写字母、数字和连字符' }]}><Input disabled={!!current} placeholder="例如 watercolor" /></Form.Item></Col></Row>
        <Form.Item name={['config', 'description']} label="一句话介绍" rules={[{ required: true }]}><Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} maxLength={500} /></Form.Item>
        <Divider />
        <h3>输入与输出</h3>
        <Form.Item name={['config', 'mode']} label="处理方式"><Select options={[{ value: 'per_image', label: '逐张处理图片，一张输入对应一张输出' }, { value: 'reference', label: '根据描述生成，可附一张参考图' }]} /></Form.Item>
        <Row gutter={16}><Col span={12}><Form.Item name={['config', 'minImages']} label="至少上传图片" rules={[{ required: true }]}><InputNumber min={0} max={mode === 'reference' ? 1 : 10} className={styles.full} /></Form.Item></Col><Col span={12}><Form.Item name={['config', 'maxImages']} label="最多上传图片" rules={[{ required: true }]}><InputNumber min={0} max={mode === 'reference' ? 1 : 10} className={styles.full} /></Form.Item></Col></Row>
        <Row gutter={16}><Col span={12}><Form.Item name={['config', 'defaultRatio']} label="输出画幅" rules={[{ required: true }]}><Select options={Object.entries(ratioLabels).map(([value, label]) => ({ value, label }))} /></Form.Item></Col>{mode === 'reference' && <Col span={12}><Form.Item name={['config', 'defaultCount']} label="每次生成数量" rules={[{ required: true }]}><InputNumber min={1} max={4} className={styles.full} /></Form.Item></Col>}</Row>
        <Space size="large" wrap><Form.Item name={['config', 'promptRequired']} label="显示描述输入框" valuePropName="checked"><Switch /></Form.Item><Form.Item name={['config', 'comparison']} label="展示原图对比" valuePropName="checked"><Switch /></Form.Item></Space>
        <Divider />
        <h3>生成规则</h3><p className={styles.help}>这些设置固定应用于每次生成，不在前台展示。已创建的任务保留原版本规则。</p>
        <Form.Item name={['config', 'instruction']} label="系统提示词" rules={[{ required: true }]}><Input.TextArea autoSize={{ minRows: 5, maxRows: 12 }} maxLength={8000} placeholder="描述画面要求、需要保留的特征，以及应避免的修改。" /></Form.Item>
        <Form.List name={['config', 'fields']}>{(fields, { add, remove }) => <><div className={styles.rulesHeader}><span>固定参数</span><Button size="small" icon={<PlusOutlined />} disabled={fields.length >= 8} onClick={() => add({ key: '', label: '', options: [], default: '' })}>添加参数</Button></div>{fields.map(field => <Card size="small" key={field.key} className={styles.rule}><Row gutter={12}><Col span={12}><Form.Item name={[field.name, 'label']} label="参数名称" rules={[{ required: true }]}><Input placeholder="如：画风" /></Form.Item></Col><Col span={12}><Form.Item name={[field.name, 'key']} label="参数标识" rules={[{ required: true }, { pattern: /^[a-z][a-z0-9_]{0,30}$/, message: '小写字母、数字和下划线' }]}><Input placeholder="如：style" /></Form.Item></Col></Row><Form.Item name={[field.name, 'options']} label="备选值" rules={[{ required: true }]}><Select mode="tags" tokenSeparators={[',', '，']} placeholder="输入后按回车确认" /></Form.Item><Form.Item noStyle shouldUpdate>{() => <Form.Item name={[field.name, 'default']} label="当前使用" rules={[{ required: true }]}><Select options={(form.getFieldValue(['config', 'fields', field.name, 'options']) || []).map((value: string) => ({ value, label: value }))} /></Form.Item>}</Form.Item><Button danger type="text" size="small" icon={<DeleteOutlined />} onClick={() => remove(field.name)}>移除参数</Button></Card>)}</>}</Form.List>
        <Divider /><h3>发布</h3><Row gutter={16}><Col span={12}><Form.Item name="enabled" label="发布到网站" valuePropName="checked"><Switch /></Form.Item></Col><Col span={12}><Form.Item name="position" label="排序（越小越靠前）"><InputNumber min={0} className={styles.full} /></Form.Item></Col></Row>
      </Form>
    </Drawer>
  </div>
}
