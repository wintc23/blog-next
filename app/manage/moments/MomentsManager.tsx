'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, App, Button, Empty, Form, Input, Modal, Pagination, Popconfirm, Select, Spin, Upload } from 'antd'
import { PlusOutlined, UploadOutlined } from '@ant-design/icons'
import { deleteLifeMoment, getLifeMoments, saveLifeMoment, type LifeMomentInput } from '@/lib/api/life-moments'
import { MOMENT_CATEGORIES, type ProfileMoment } from '@/lib/schemas/personal-profile'
import { uploadToQiniu } from '@/lib/upload'
import styles from './MomentsManager.module.css'

function newMoment(): LifeMomentInput {
  const date = new Date()
  return {
    date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
    category: 'daily', text: '', imageUrl: '', imageAlt: '', location: '',
  }
}

export default function MomentsManager() {
  const { message } = App.useApp()
  const [form] = Form.useForm<LifeMomentInput>()
  const [list, setList] = useState<ProfileMoment[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ProfileMoment | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [clientReady, setClientReady] = useState(false)
  const requestId = useRef(0)
  const imageUrl = Form.useWatch('imageUrl', form)

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

  const edit = (moment: ProfileMoment | null) => {
    setEditing(moment)
    form.resetFields()
    if (moment) {
      const { id: _id, ...values } = moment
      form.setFieldsValue(values)
    } else {
      form.setFieldsValue(newMoment())
    }
    setOpen(true)
  }

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      message.error('请选择不超过 5 MB 的图片')
      return Upload.LIST_IGNORE
    }
    setUploading(true)
    try {
      form.setFieldsValue({ imageUrl: await uploadToQiniu(file) })
    } catch {
      message.error('图片上传失败，请重试')
    } finally {
      setUploading(false)
    }
    return Upload.LIST_IGNORE
  }

  const save = async (values: LifeMomentInput) => {
    setSaving(true)
    try {
      await saveLifeMoment(values, editing?.id)
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
        <div className={styles.actions}><Button href="/moments" target="_blank" rel="noreferrer">查看全部动态</Button><Button type="primary" icon={<PlusOutlined />} disabled={saving} onClick={() => edit(null)}>发布动态</Button></div>
      </header>
      {error ? <Alert type="error" showIcon message="加载动态失败" description={error} action={<Button onClick={load}>重试</Button>} /> : (
        <Spin spinning={loading}>
          {!loading && total === 0 ? <Empty description="还没有动态，可以发布第一条记录。" /> : (
            <ul className={styles.list}>
              {list.map((moment) => (
                <li key={moment.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={moment.imageUrl} alt={moment.imageAlt || '动态照片'} width={100} height={80} loading="lazy" />
                  <div className={styles.description}><div className={styles.meta}><time dateTime={moment.date}>{moment.date}</time><span>{MOMENT_CATEGORIES.find(({ value }) => value === moment.category)?.label}</span>{moment.location && <span>{moment.location}</span>}</div><p>{moment.text}</p></div>
                  <div className={styles.actions}>
                    <Button disabled={saving} onClick={() => edit(moment)} aria-label={`编辑 ${moment.date} 的动态`}>编辑</Button>
                    <Popconfirm title="删除这条动态？" description="删除后将不再显示在首页和历史动态中。" okText="删除" cancelText="取消" onConfirm={() => remove(moment)}>
                      <Button danger disabled={saving} aria-label={`删除 ${moment.date} 的动态`}>删除</Button>
                    </Popconfirm>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Pagination className={styles.pagination} current={page} pageSize={12} total={total} hideOnSinglePage showSizeChanger={false} disabled={saving} onChange={setPage} />
        </Spin>
      )}
      {clientReady && <Modal title={editing ? '编辑动态' : '发布动态'} open={open} footer={null} forceRender maskClosable={false}
        closable={!saving && !uploading} onCancel={() => { if (!saving && !uploading) setOpen(false) }}>
        <Form<LifeMomentInput> form={form} layout="vertical" onFinish={save} disabled={saving || uploading} scrollToFirstError>
          <div className={styles.columns}>
            <Form.Item name="date" label="日期" rules={[{ required: true, message: '请选择日期' }]}><Input type="date" /></Form.Item>
            <Form.Item name="category" label="分类" rules={[{ required: true }]}><Select options={[...MOMENT_CATEGORIES]} /></Form.Item>
          </div>
          <Form.Item name="imageUrl" label="照片地址" rules={[{ required: true, message: '请上传照片或填写图片地址' }, { type: 'url', message: '请填写完整的图片地址' }]}>
            <Input type="url" maxLength={2048} placeholder="上传照片或粘贴图片地址" />
          </Form.Item>
          <div className={styles.photoTools}>
            {imageUrl && /^https?:\/\//i.test(imageUrl) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="照片预览" width={144} height={90} />
            )}
            <Upload accept="image/*" showUploadList={false} beforeUpload={upload} disabled={saving || uploading}><Button icon={<UploadOutlined />} loading={uploading}>上传照片</Button></Upload>
            <span>不超过 5 MB</span>
          </div>
          <Form.Item name="text" label="短文" rules={[{ required: true, whitespace: true, message: '写几句话记录这次经历吧' }]}>
            <Input.TextArea rows={4} maxLength={280} showCount />
          </Form.Item>
          <Form.Item name="location" label="地点（选填）"><Input maxLength={60} /></Form.Item>
          <Form.Item name="imageAlt" label="照片描述（选填）" extra="帮助无法看到照片的访客理解画面。"><Input maxLength={120} /></Form.Item>
          <div className={styles.formActions}><Button disabled={saving || uploading} onClick={() => setOpen(false)}>取消</Button><Button type="primary" htmlType="submit" loading={saving} disabled={uploading}>{editing ? '保存修改' : '发布'}</Button></div>
        </Form>
      </Modal>}
    </div>
  )
}
