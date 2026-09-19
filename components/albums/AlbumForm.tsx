'use client'
import { useState } from 'react'
import { App, Form, Input, Modal, Radio } from 'antd'
import { apiFetch } from '@/lib/api/client'
import { AlbumSchema, type Album } from '@/lib/albums'
export default function AlbumForm({ album, onClose, onSaved }: { album?: Album; onClose: () => void; onSaved: (album: Album) => void }) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [busy, setBusy] = useState(false)
  return <Modal open title={album ? '编辑画册' : '新建画册'} onCancel={onClose} okText="保存" cancelText="取消" confirmLoading={busy} onOk={() => form.submit()}>
    <Form form={form} layout="vertical" initialValues={album || { title: '', description: '', visibility: 'private' }} onFinish={async values => {
      setBusy(true)
      try { onSaved(await apiFetch(album ? `/albums/${album.id}/` : '/albums/', { method: album ? 'PATCH' : 'POST', data: { ...values, ...(album ? { version: album.version } : {}) }, schema: AlbumSchema })) }
      catch (error) { message.error(error instanceof Error ? error.message : '保存失败') }
      finally { setBusy(false) }
    }}>
      <Form.Item name="title" label="画册名称" rules={[{ required: true, whitespace: true, message: '请填写画册名称' }]}><Input maxLength={100} /></Form.Item>
      <Form.Item name="description" label="简介"><Input.TextArea maxLength={1000} autoSize={{ minRows: 2, maxRows: 5 }} /></Form.Item>
      <Form.Item name="visibility" label="可见范围" extra="私密画册仅自己可见；公开画册会出现在画册列表，也可以分享链接。"><Radio.Group options={[{ label: '私密', value: 'private' }, { label: '公开', value: 'public' }]} /></Form.Item>
    </Form>
  </Modal>
}
