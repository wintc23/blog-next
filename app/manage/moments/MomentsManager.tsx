'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, App, Button, Empty, Form, Input, Modal, DatePicker, AutoComplete, Collapse, Pagination, Popconfirm, Select, Spin } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import 'dayjs/locale/zh-cn'
import { PhonePublishButton } from '@/components/device-login/DeviceLogin'
import { PlusOutlined } from '@ant-design/icons'
import { deleteLifeMoment, getLifeMoments, saveLifeMoment, type LifeMomentInput } from '@/lib/api/life-moments'
import { apiFetch } from '@/lib/api/client'
import { ProfileMomentSchema, MOMENT_CATEGORIES, type ProfileMoment } from '@/lib/schemas/personal-profile'
import { currentMomentTime, momentClock, momentTimeLabel } from '@/lib/life-moments'
import MomentImagesEditor from './MomentImagesEditor'
import styles from './MomentsManager.module.css'

type MomentForm = Omit<LifeMomentInput, 'occurredAt'> & { localTime: Dayjs | null }

function newMoment(): MomentForm {
  const localTime = currentMomentTime()
  return {
    date: localTime.slice(0, 10), localTime: dayjs(localTime).locale('zh-cn'),
    category: 'daily', text: '', images: [], location: '',
  }
}

export default function MomentsManager({ initialEditId }: { initialEditId?: string }) {
  const { message } = App.useApp()
  const [form] = Form.useForm<MomentForm>()
  const [list, setList] = useState<ProfileMoment[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ProfileMoment | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imageInteraction, setImageInteraction] = useState(false)
  const [details, setDetails] = useState<string[]>([])
  const [clientReady, setClientReady] = useState(false)
  const requestId = useRef(0)

  useEffect(() => { setClientReady(true) }, [])

  const load = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true)
    setError('')
    try {
      const data = await getLifeMoments(page, 12)
      if (id !== requestId.current) return
      setList(data.list)
      setTotal(data.total)
      if (data.page !== page) setPage(data.page)
    } catch (cause) {
      if (id === requestId.current) setError(cause instanceof Error ? cause.message : '加载动态失败')
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [page])

  useEffect(() => { void load(); return () => { requestId.current += 1 } }, [load])

  const edit = useCallback((moment: ProfileMoment | null) => {
    setDetails([])
    setEditing(moment)
    form.resetFields()
    if (moment) {
      form.setFieldsValue({ ...moment, localTime: moment.occurredAt ? dayjs(`${moment.date}T${momentClock(moment)}`).locale('zh-cn') : null })
    } else {
      form.setFieldsValue(newMoment())
    }
    setOpen(true)
  }, [form])

  useEffect(() => {
    if (!initialEditId) return
    const controller = new AbortController()
    apiFetch(`/life-moments/${encodeURIComponent(initialEditId)}/`, { schema: ProfileMomentSchema, signal: controller.signal, cache: 'no-store' })
      .then(moment => { if (!controller.signal.aborted) edit(moment) })
      .catch(error => { if (!controller.signal.aborted) message.error(error instanceof Error ? error.message : '加载动态失败') })
    return () => controller.abort()
  }, [initialEditId, edit, message])

  const save = async ({ localTime, ...values }: MomentForm) => {
    setSaving(true)
    try {
      await saveLifeMoment({ ...values, date: localTime ? localTime.format('YYYY-MM-DD') : editing?.date || values.date, occurredAt: localTime ? `${localTime.format('YYYY-MM-DDTHH:mm')}:00+08:00` : null }, editing?.id)
      setOpen(false)
      message.success(editing ? '动态已更新' : '动态已发布')
      if (!editing && page !== 1) setPage(1)
      else await load()
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : '保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (moment: ProfileMoment) => {
    setSaving(true)
    try {
      await deleteLifeMoment(moment.id)
      message.success('动态已删除')
      await load()
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : '删除失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.manager}>
      <header className={styles.heading}>
        <div><h1>生活动态</h1><p>记录日常与旅行。每条动态独立发布，历史内容持续保留。</p></div>
        <div className={styles.actions}><PhonePublishButton /><Button href="/moments" target="_blank" rel="noreferrer">查看全部动态</Button><Button type="primary" icon={<PlusOutlined />} disabled={saving} onClick={() => edit(null)}>发布动态</Button></div>
      </header>
      {error ? <Alert type="error" showIcon message="加载动态失败" description={error} action={<Button onClick={load}>重试</Button>} /> : (
        <Spin spinning={loading}>
          {!loading && total === 0 ? <Empty description="还没有动态，可以发布第一条记录。" /> : (
            <ul className={styles.list}>
              {list.map((moment) => (
                <li key={moment.id}>
                  {moment.images.length ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={moment.images[0].url} alt={moment.images[0].description || '动态照片'} width={100} height={80} loading="lazy" />
                  ) : <span />}
                  <div className={styles.description}><div className={styles.meta}><a href={`/moments/${moment.id}`} target="_blank" rel="noreferrer"><time dateTime={moment.occurredAt || moment.date}>{momentTimeLabel(moment)}</time></a><span>{MOMENT_CATEGORIES.find(({ value }) => value === moment.category)?.label}</span>{moment.location && <span>{moment.location}</span>}{moment.images.length > 0 && <span>{moment.images.length} 张图片</span>}</div><p>{moment.text}</p></div>
                  <div className={styles.actions}>
                    <Button disabled={saving} onClick={() => edit(moment)} aria-label={`编辑 ${momentTimeLabel(moment)} 的动态`}>编辑</Button>
                    <Popconfirm title="删除这条动态？" description="删除后将不再显示在首页和历史动态中。" okText="删除" cancelText="取消" onConfirm={() => remove(moment)}>
                      <Button danger disabled={saving} aria-label={`删除 ${momentTimeLabel(moment)} 的动态`}>删除</Button>
                    </Popconfirm>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Pagination className={styles.pagination} current={page} pageSize={12} total={total} hideOnSinglePage showSizeChanger={false} disabled={saving} onChange={setPage} />
        </Spin>
      )}
      {clientReady && <Modal title={editing ? '编辑动态' : '发布动态'} open={open} width={640} forceRender maskClosable={false} keyboard={!imageInteraction}
        style={{ top: 24 }} styles={{ body: { maxHeight: 'calc(100dvh - 200px)', overflowY: 'auto', paddingInline: 2 } }}
        footer={<div className={styles.formActions}><Button disabled={saving || uploading} onClick={() => setOpen(false)}>取消</Button><Button type="primary" htmlType="submit" form="life-moment-form" loading={saving} disabled={uploading}>{editing ? '保存修改' : '发布'}</Button></div>}
        closable={!saving && !uploading} onCancel={() => { if (!saving && !uploading) setOpen(false) }}>
        <Form<MomentForm> id="life-moment-form" form={form} layout="vertical" onFinish={save} disabled={saving || uploading} scrollToFirstError>
          <Form.Item name="text" rules={[{ required: true, whitespace: true, message: '写几句话记录这一刻吧' }]}>
            <Input.TextArea aria-label="动态内容" placeholder="分享这一刻…" autoSize={{ minRows: 4, maxRows: 12 }} maxLength={2000} showCount />
          </Form.Item>
          <Form.Item name="images"><MomentImagesEditor onInteractionChange={setImageInteraction} active={open} disabled={saving || uploading} onUploadingChange={setUploading} onApplyMetadata={value => {
            form.setFieldsValue({ ...(value.takenAt ? { localTime: dayjs(value.takenAt).locale('zh-cn') } : {}), ...(value.location ? { location: value.location } : {}) }); setDetails(['details']); message.success('已填入照片信息，可继续修改')
          }} /></Form.Item>
          <Collapse ghost activeKey={details} onChange={keys => setDetails(Array.isArray(keys) ? keys : [keys])} items={[{ key: 'details', label: '日期、地点和分类', forceRender: true, children: <>
            <Form.Item name="localTime" label="时间（北京时间）" extra={editing && !editing.occurredAt ? `原记录日期为 ${editing.date}，留空保留原日期。` : undefined}
              rules={[{ required: !editing || !!editing.occurredAt, message: '请选择日期和时间' }]}><DatePicker presets={[{ label: '现在', value: () => dayjs(currentMomentTime()).locale('zh-cn') }, { label: '昨天', value: () => dayjs(currentMomentTime()).subtract(1, 'day').locale('zh-cn') }]} showTime={{ format: 'HH:mm' }} format="YYYY-MM-DD HH:mm" className={styles.fullWidth} /></Form.Item>
            <Form.Item name="category" label="分类" rules={[{ required: true }]}><Select options={[...MOMENT_CATEGORIES]} /></Form.Item>
            <Form.Item name="location" label="地点（选填）"><AutoComplete options={[...new Set(list.map(moment => moment.location).filter(Boolean))].map(value => ({ value }))} filterOption={(input, option) => String(option?.value).toLowerCase().includes(input.toLowerCase())}><Input maxLength={60} placeholder="填写地点或选择已用地点" /></AutoComplete></Form.Item>
          </> }]} />
        </Form>
      </Modal>}
    </div>
  )
}
