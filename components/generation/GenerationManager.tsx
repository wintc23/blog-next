'use client'
import { v4 as uuidv4 } from 'uuid'

import { useRef, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { Alert, Button, DatePicker, Drawer, Empty, Form, Input, InputNumber, Modal, Radio, Select, Spin, Switch, Table, Tabs, Tag, message } from 'antd'
import { z } from 'zod'
import dayjs from 'dayjs'
import { apiFetch } from '@/lib/api/client'
import { generationMetaSchema, taskListSchema, sourceListSchema, jobListSchema, jobDetailSchema, type GenerationTask, type GenerationSource, type GenerationJobDetail } from '@/lib/schemas/generation'
import { formatTime } from '@/components/ai-digest/DigestShared'
import styles from './Generation.module.css'
import ChannelSettings from './ChannelSettings'

export const jobLabels: Record<string, string> = { queued: '等待执行', running: '执行中', retry_wait: '等待重试', succeeded: '已完成', failed: '失败', cancelled: '已取消' }
export const stageLabels: Record<string, string> = { collect: '采集资料', text: '生成正文', image: '生成配图', upload: '上传图片', validate: '核对来源', persist: '保存内容', complete: '完成' }
const errorText = (error: unknown) => error instanceof Error ? error.message : '操作失败'
const time = (value?: string | null) => value ? formatTime(value) : '—'
const missingLabel = (value: string) => ({ 'text_model.base_url': '文字 API 地址', 'text_model.model': '文字模型', 'image_model.base_url': '图片 API 地址', 'image_model.model': '图片模型', CONTENT_TEXT_API_KEY: '文字服务密钥', CONTENT_IMAGE_API_KEY: '图片服务密钥', CONTENT_CPA_API_KEY: 'CPA 服务密钥', CONTENT_CPA_BASE_URL: 'CPA 本机服务地址', CONTENT_CODEX_BIN: 'Codex CLI', CONTENT_IMAGE_CODEX_LOGIN: 'Codex 配图账号登录', source_ids: '采集来源' }[value] || value)

export default function GenerationManager({ initialJobId }: { initialJobId?: number }) {
  const [messages, contextHolder] = message.useMessage()
  const tasks = useSWR('/generation/tasks/', p => apiFetch(p, { schema: taskListSchema }), { refreshInterval: 15000 })
  const meta = useSWR('/generation/meta/', p => apiFetch(p, { schema: generationMetaSchema }), { refreshInterval: 15000 })
  const sources = useSWR('/generation/sources/', p => apiFetch(p, { schema: sourceListSchema }))
  const [page, setPage] = useState(1)
  const jobs = useSWR(['/generation/jobs/', page], ([p, n]) => apiFetch(p, { params: { page: n }, schema: jobListSchema }), { refreshInterval: 10000 })
  const [editing, setEditing] = useState<GenerationTask | 'new' | null>(null)
  const [editingSource, setEditingSource] = useState<GenerationSource | 'new' | null>(null)
  const [runTask, setRunTask] = useState<GenerationTask | null>(null)
  const [runDate, setRunDate] = useState('')
  const [jobId, setJobId] = useState<number | null>(initialJobId || null)
  const detail = useSWR(jobId ? `/generation/jobs/${jobId}/` : null, p => apiFetch(p, { schema: jobDetailSchema }), { refreshInterval: 5000 })
  const [busy, setBusy] = useState(false)
  const [form] = Form.useForm()
  const textProvider = Form.useWatch(['config', 'textModel', 'provider'], form)
  const imageProvider = Form.useWatch(['config', 'imageModel', 'provider'], form)
  const [sourceForm] = Form.useForm()
  const requestId = useRef('')
  const selectedTask = editing && editing !== 'new' ? editing : null
  const refresh = () => { void tasks.mutate(); void jobs.mutate(); void sources.mutate(); void detail.mutate() }

  function editTask(task: GenerationTask | 'new') {
    if (!meta.data) return
    setEditing(task)
    form.resetFields()
    form.setFieldsValue(task === 'new' ? { name: '', contentType: meta.data.contentTypes[0]?.value, environment: 'production', enabled: false, config: meta.data.defaultConfig } : task)
  }

  async function saveTask(values: Record<string, unknown>) {
    setBusy(true)
    try {
      const baseConfig = selectedTask?.config || meta.data!.defaultConfig
      const edits = values.config as typeof baseConfig
      const imageModel = { ...baseConfig.imageModel, ...edits.imageModel }
      if (imageModel.provider === 'cpa') {
        imageModel.baseUrl = ''
        imageModel.credentialRef = 'CONTENT_CPA_API_KEY'
      }
      await apiFetch(selectedTask ? `/generation/tasks/${selectedTask.id}/` : '/generation/tasks/', {
        method: selectedTask ? 'PUT' : 'POST', data: { ...values, config: { ...baseConfig, ...edits,
          textModel: { ...baseConfig.textModel, ...edits.textModel }, imageModel }, ...(selectedTask ? { version: selectedTask.version } : {}) },
      })
      setEditing(null); refresh(); messages.success('任务配置已保存')
    } catch (error) { messages.error(errorText(error)) } finally { setBusy(false) }
  }

  async function triggerRun() {
    if (!runTask || !runDate) return
    setBusy(true)
    try {
      const result = await apiFetch(`/generation/tasks/${runTask.id}/run/`, { method: 'POST', data: { edition: runDate, purpose: 'test', requestId: requestId.current }, schema: z.object({ id: z.number() }) })
      setRunTask(null); setJobId(result.id); refresh(); messages.success('已加入服务端任务队列，生成结果保留为草稿')
    } catch (error) { messages.error(errorText(error)) } finally { setBusy(false) }
  }

  async function jobAction(action: string) {
    setBusy(true)
    try { await apiFetch(`/generation/jobs/${jobId}/`, { method: 'POST', data: { action } }); refresh() }
    catch (error) { messages.error(errorText(error)) } finally { setBusy(false) }
  }

  const errors = [tasks.error, meta.error, sources.error, jobs.error].filter(Boolean)
  return <div className={styles.page}>
    {contextHolder}
    <header className={styles.header}><div><h1>生成管理</h1><p>配置内容来源、生成要求与时间，查看服务端执行进度。</p></div><div className={styles.actions}><Link href="/manage/content">内容管理</Link><Button type="primary" onClick={() => editTask('new')} disabled={!meta.data}>新建任务</Button></div></header>
    {errors.length > 0 && <Alert className={styles.alert} type="error" showIcon message={errorText(errors[0])} action={<Button onClick={refresh}>重新加载</Button>} />}
    <div className={styles.health}><strong>服务状态</strong>{meta.data?.heartbeats.length ? meta.data.heartbeats.map((h, i) => <Tag key={i} color={h.healthy ? 'green' : 'orange'}>{h.environment === 'production' ? '线上' : '开发'} · {h.role === 'scheduler' ? '调度器' : '执行进程'} · {h.healthy ? '运行中' : '心跳过期'}</Tag>) : <span>尚未检测到服务端任务进程</span>}<span>时间均为北京时间</span></div>
    <Tabs items={[
      { key: 'tasks', label: '生成任务', children: tasks.isLoading ? <Spin /> : <div className={styles.tasks}>{tasks.data?.list.length ? tasks.data.list.map(task => <section className={styles.task} key={task.id}>
        <div className={styles.taskHeading}><h2>{task.name}</h2><Tag color={task.enabled ? 'blue' : 'default'}>{task.enabled ? '已启用' : '已停用'}</Tag></div>
        <p className={styles.muted}>{task.environment === 'production' ? '线上环境' : '开发环境'} · 第 {task.version} 版配置 · {task.config.autoPublish ? '校验后定时发布' : '生成后保留草稿'}</p>
        <dl><dt>生成 / 发布</dt><dd>{task.config.generateTime} / {task.config.publishTime}</dd><dt>下次生成</dt><dd>{time(task.nextGenerateAt)}</dd><dt>最近执行</dt><dd>{task.lastJob ? <Button type="link" size="small" onClick={() => setJobId(task.lastJob!.id)}>{jobLabels[task.lastJob.status]} · {task.lastJob.edition}</Button> : '暂无执行记录'}</dd></dl>
        {task.missingConfiguration.length > 0 && <p className={styles.muted}>待配置：{task.missingConfiguration.map(missingLabel).join('、')}</p>}
        <div className={styles.actions}><Button onClick={() => editTask(task)}>配置任务</Button><Button onClick={() => { setRunTask(task); setRunDate(meta.data?.today || ''); requestId.current = uuidv4() }}>手动试运行</Button></div>
      </section>) : <Empty description="还没有生成任务" />}</div> },
      { key: 'sources', label: '资料来源', children: <><div className={styles.actions}><Button type="primary" onClick={() => { setEditingSource('new'); sourceForm.resetFields(); sourceForm.setFieldsValue({ enabled: true }) }}>添加 RSS / Atom 来源</Button></div><div className={styles.table}><Table rowKey="id" dataSource={sources.data?.list} pagination={false} columns={[
        { title: '来源', dataIndex: 'name', render: (_, s) => <div className={styles.sourceTitle}><strong>{s.name}</strong><p className={styles.muted}>{s.endpointUrl}</p></div> },
        { title: '状态', render: (_, s) => <Tag>{s.kind !== 'rss' ? '历史手动来源' : s.enabled ? '已启用' : '已停用'}</Tag> },
        { title: '最近采集', render: (_, s) => <span>{time(s.lastSuccessAt)}{s.lastError && <p>{s.lastError}</p>}</span> },
        { title: '操作', render: (_, s) => s.kind === 'rss' && <div className={styles.actions}><Button onClick={() => { setEditingSource(s); sourceForm.setFieldsValue(s) }}>编辑</Button><Button onClick={async () => { try { const r = await apiFetch(`/generation/sources/${s.id}/probe/`, { method: 'POST', schema: z.object({ count: z.number() }) }); messages.success(`读取到 ${r.count} 条带日期的资料`) } catch (error) { messages.error(errorText(error)) } }}>测试来源</Button></div> },
      ]} /></div></> },
      { key: 'channel', label: '栏目介绍', children: <ChannelSettings /> },
      { key: 'jobs', label: '执行记录', children: <div className={styles.table}><Table rowKey="id" dataSource={jobs.data?.list} loading={jobs.isLoading} pagination={{ current: page, pageSize: 20, total: jobs.data?.total, showSizeChanger: false, onChange: setPage }} columns={[
        { title: '期次', dataIndex: 'edition' }, { title: '任务', render: (_, j) => tasks.data?.list.find(t => t.id === j.taskId)?.name || `#${j.taskId}` },
        { title: '触发方式', render: (_, j) => j.purpose === 'scheduled' ? '定时' : '手动' },
        { title: '状态', render: (_, j) => <Tag color={j.status === 'failed' ? 'red' : j.status === 'succeeded' ? 'green' : 'blue'}>{jobLabels[j.status]}</Tag> },
        { title: '进度', render: (_, j) => `${stageLabels[j.stage] || j.stage} · 第 ${j.attempt} 次` },
        { title: '详情', render: (_, j) => <Button onClick={() => setJobId(j.id)}>查看记录</Button> },
      ]} /></div> },
    ]} />
    <Drawer title={selectedTask ? `配置 · ${selectedTask.name}` : '新建生成任务'} open={!!editing} onClose={() => setEditing(null)} width={640} destroyOnClose>
      <Form className={styles.form} form={form} layout="vertical" onFinish={saveTask}>
        <fieldset><legend>基本信息</legend><Form.Item name="name" label="任务名称" rules={[{ required: true, max: 128 }]}><Input /></Form.Item>
          {!selectedTask && <><Form.Item name="contentType" label="内容类型" rules={[{ required: true }]}><Select options={meta.data?.contentTypes} /></Form.Item><Form.Item name="environment" label="执行环境"><Radio.Group options={[{ value: 'production', label: '线上' }, { value: 'development', label: '开发' }]} /></Form.Item></>}
          {selectedTask && <Form.Item name="enabled" label="自动执行" valuePropName="checked"><Switch checkedChildren="启用" unCheckedChildren="停用" /></Form.Item>}
        </fieldset>
        <fieldset><legend>资料与写作</legend><Form.Item name={['config', 'sourceIds']} label="采集来源"><Select mode="multiple" options={sources.data?.list.filter(s => s.kind === 'rss').map(s => ({ value: s.id, label: s.name + (s.enabled ? '' : '（已停用）'), disabled: !s.enabled }))} /></Form.Item>
          <Form.Item name={['config', 'lookbackHours']} label="优先采集最近几小时"><InputNumber min={1} max={72} /></Form.Item><Form.Item name={['config', 'maxLookbackHours']} label="资料不足时最多回溯几小时"><InputNumber min={1} max={168} /></Form.Item>
          <Form.Item name={['config', 'minChars']} label="正文最少字数"><InputNumber min={100} max={10000} /></Form.Item><Form.Item name={['config', 'maxChars']} label="正文最多字数"><InputNumber min={100} max={15000} /></Form.Item>
          <Form.Item name={['config', 'prompt']} label="写作要求" rules={[{ required: true }]}><Input.TextArea rows={5} /></Form.Item><Form.Item name={['config', 'imagePrompt']} label="配图风格要求" rules={[{ required: true }]}><Input.TextArea rows={4} /></Form.Item>
        </fieldset>
        <fieldset><legend>阅读分区</legend><p className={styles.muted}>每条新闻只归入一个分区。名称和说明随生成结果保存，没有内容的分区不展示。</p>
          <Form.List name={['config', 'digestGroups']}>{fields => fields.map(field => <div key={field.key}>
            <Form.Item name={[field.name, 'id']} hidden><Input /></Form.Item>
            <Form.Item name={[field.name, 'title']} label={`分区 ${field.name + 1} 名称`} rules={[{ required: true, max: 32 }]}><Input /></Form.Item>
            <Form.Item name={[field.name, 'description']} label={`分区 ${field.name + 1} 说明`} rules={[{ required: true, max: 200 }]}><Input.TextArea rows={2} /></Form.Item>
          </div>)}</Form.List>
        </fieldset>
        {(['textModel', 'imageModel'] as const).map(key => {
          const isCodex = (key === 'textModel' ? textProvider : imageProvider) === 'codex'
          const isCpa = key === 'imageModel' && imageProvider === 'cpa'
          return <fieldset key={key}><legend>{key === 'textModel' ? '文字模型' : '图片模型'}</legend>
          <Form.Item name={['config', key, 'provider']} label="生成方式"><Radio.Group options={[...(key === 'imageModel' ? [{ value: 'cpa', label: 'Codex 登录（CPA）' }] : []), { value: 'codex', label: 'Codex CLI' }, { value: 'openai_compatible', label: '兼容 API' }]} onChange={event => {
            if (event.target.value === 'cpa') {
              form.setFieldsValue({ config: { imageModel: { baseUrl: '', credentialRef: 'CONTENT_CPA_API_KEY', model: 'gpt-image-2.5-flare', responseFormat: 'auto', timeout: 600 } } })
            } else if (isCpa) {
              form.setFieldsValue({ config: { imageModel: { credentialRef: 'CONTENT_IMAGE_API_KEY', model: '' } } })
            }
          }} /></Form.Item>
          {isCpa ? <p className={styles.muted}>通过 CPA 复用服务器 Codex 的凭据和模型服务生成配图，连接由服务器管理。</p> : !isCodex ? <><Form.Item name={['config', key, 'baseUrl']} label="兼容 API 地址（包含 /v1）"><Input type="url" placeholder="https://服务地址/v1" /></Form.Item>
            <Form.Item name={['config', key, 'credentialRef']} label="服务端密钥环境变量名" extra="只填写变量名，密钥在服务器配置。"><Input autoComplete="off" /></Form.Item></> : <p className={styles.muted}>{key === 'imageModel' ? '使用 Codex 内置图片工具。服务器需配置支持图片生成的 ChatGPT 登录。' : '使用服务账户已登录的 Codex CLI。服务器需安装 Codex，并完成登录。'}</p>}
          <Form.Item name={['config', key, 'model']} label={key === 'imageModel' && isCodex ? 'Codex 调度模型' : '模型名称'} rules={isCpa ? [{ required: true, message: '请输入图片模型名称' }] : undefined} extra={isCodex ? '留空使用 Codex 默认模型。' : undefined}><Input /></Form.Item>
          <Form.Item name={['config', key, 'timeout']} label="请求超时（秒）"><InputNumber min={30} max={600} /></Form.Item>
          {key === 'imageModel' && <><Form.Item name={['config', key, 'size']} label={isCodex ? '期望图片尺寸' : '图片尺寸'} extra={isCodex ? '作为画面要求交给 Codex，最终尺寸以生成结果为准。' : undefined}><Input /></Form.Item>{!isCodex && <Form.Item name={['config', key, 'responseFormat']} label="图片返回格式"><Radio.Group options={[{ value: 'auto', label: '服务商默认' }, { value: 'b64_json', label: 'Base64' }]} /></Form.Item>}</>}
        </fieldset>})}
        <fieldset><legend>执行与发布</legend><Form.Item name={['config', 'generateTime']} label="生成时间（北京时间）" rules={[{ required: true }]}><Input type="time" /></Form.Item><Form.Item name={['config', 'publishTime']} label="发布时间（北京时间）" rules={[{ required: true }]}><Input type="time" /></Form.Item>
          <Form.Item name={['config', 'lateMinutes']} label="允许延迟发布的分钟数"><InputNumber min={0} max={720} /></Form.Item><Form.Item name={['config', 'maxRetries']} label="失败后最多自动重试次数"><InputNumber min={0} max={3} /></Form.Item>
          <Form.Item name={['config', 'autoPublish']} label="校验通过后定时发布" valuePropName="checked"><Switch /></Form.Item>
        </fieldset>
        <div className={styles.formFooter}><Button type="primary" htmlType="submit" loading={busy}>保存配置</Button></div>
      </Form>
    </Drawer>
    <Drawer title="资料来源" open={!!editingSource} onClose={() => setEditingSource(null)} width={520}>
      <Form className={styles.form} form={sourceForm} layout="vertical" onFinish={async values => { setBusy(true); try { await apiFetch(editingSource && editingSource !== 'new' ? `/generation/sources/${editingSource.id}/` : '/generation/sources/', { method: editingSource === 'new' ? 'POST' : 'PUT', data: values }); setEditingSource(null); refresh() } catch (error) { messages.error(errorText(error)) } finally { setBusy(false) } }}>
        <Form.Item name="name" label="来源名称" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="endpointUrl" label="RSS / Atom 地址" rules={[{ required: true, type: 'url' }]}><Input type="url" /></Form.Item><Form.Item name="titleKeywords" label="标题关键词" extra="匹配任意一个词即可；留空采集全部。综合资讯源建议筛选 AI 相关主题。"><Select mode="tags" tokenSeparators={[",", "，"]} placeholder="例如：人工智能、豆包、DeepSeek" /></Form.Item><Form.Item name="enabled" label="启用采集" valuePropName="checked"><Switch /></Form.Item><Button type="primary" htmlType="submit" loading={busy}>保存来源</Button>
      </Form>
    </Drawer>
    <Modal title={`试运行 · ${runTask?.name || ''}`} open={!!runTask} onCancel={() => setRunTask(null)} onOk={triggerRun} confirmLoading={busy} okText="加入任务队列">
      <p>使用当前已保存的配置生成草稿。已有已发布内容会继续展示。</p><label htmlFor="generation-edition">期次日期（北京时间）</label><DatePicker id="generation-edition" value={runDate ? dayjs(runDate) : null} maxDate={meta.data?.today ? dayjs(meta.data.today) : undefined} onChange={value => { setRunDate(value ? value.format('YYYY-MM-DD') : ''); requestId.current = uuidv4() }} />
    </Modal>
    <Drawer title={`执行记录 #${jobId || ''}`} open={jobId !== null} onClose={() => setJobId(null)} width={720}>
      {detail.error && <Alert type="error" message={errorText(detail.error)} />}
      {detail.data ? <JobDetail job={detail.data} busy={busy} onAction={jobAction} /> : <Spin />}
    </Drawer>
  </div>
}

function JobDetail({ job, busy, onAction }: { job: GenerationJobDetail; busy: boolean; onAction: (action: string) => void }) {
  const contentId = job.runs.map(r => r.result.contentId).find(value => typeof value === 'number')
  return <><p><Tag>{jobLabels[job.status]}</Tag>{stageLabels[job.stage]} · {job.edition}</p>{job.errorMessage && <Alert className={styles.alert} type="error" message={job.errorMessage} />}
    <div className={styles.actions}>{['failed', 'cancelled'].includes(job.status) && <Button loading={busy} onClick={() => onAction('retry')}>重试失败阶段</Button>}{['queued', 'running', 'retry_wait'].includes(job.status) && <Button danger loading={busy} onClick={() => onAction('cancel')}>取消任务</Button>}{typeof contentId === 'number' && <Link href={`/manage/content/${contentId}`}>查看生成内容</Link>}</div>
    <h3>执行尝试</h3>{job.runs.map(run => <section key={run.id}><p>第 {run.attempt} 次 · {jobLabels[run.status]} · {time(run.startedAt)}</p>{run.errorMessage && <p>{run.errorMessage}</p>}<pre className={styles.details}>{JSON.stringify(run.result, null, 2)}</pre></section>)}
    <details><summary>输入资料与阶段产物</summary><pre className={styles.details}>{JSON.stringify(job.checkpoint, null, 2)}</pre></details>
  </>
}
