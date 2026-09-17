'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Alert, Button, Form, Input, Spin, message } from 'antd'
import { apiFetch } from '@/lib/api/client'
import { aiDigestSettingsSchema } from '@/lib/schemas/ai-digest'
import styles from './Generation.module.css'

export default function ChannelSettings() {
  const [messages, contextHolder] = message.useMessage()
  const [saving, setSaving] = useState(false)
  const { data, error, isLoading, mutate } = useSWR('/generation/channel/', path => apiFetch(path, { schema: aiDigestSettingsSchema }), { revalidateOnFocus: false })
  if (isLoading) return <Spin />
  if (error) return <Alert type="error" showIcon message={error.message} action={<Button onClick={() => void mutate()}>重新加载</Button>} />
  if (!data) return <Alert type="info" message="请先初始化栏目配置。" />
  return <div className={styles.editor}>
    {contextHolder}
    <p className={styles.muted}>设置首页展示的栏目简介。生成要求和定时发布规则在“生成任务”中配置。</p>
    <Form className={styles.form} layout="vertical" initialValues={{ ...data, introduction: data.introduction || { summary: '', note: '', groups: [{ id: 'applications', title: '', description: '' }, { id: 'development', title: '', description: '' }] } }} onFinish={async values => {
      setSaving(true)
      try {
        const saved = await apiFetch('/generation/channel/', { method: 'PUT', data: values, schema: aiDigestSettingsSchema })
        await mutate(saved, false)
        messages.success('栏目简介已保存')
      } catch (err) { messages.error(err instanceof Error ? err.message : '保存失败') }
      finally { setSaving(false) }
    }}>
      <Form.Item name="title" label="栏目名称" rules={[{ required: true, whitespace: true, max: 128 }]}><Input maxLength={128} /></Form.Item>
      <Form.Item name={['introduction', 'summary']} label="栏目说明" rules={[{ required: true, whitespace: true, max: 200 }]}><Input.TextArea rows={2} maxLength={200} showCount /></Form.Item>
      <Form.List name={['introduction', 'groups']}>{fields => fields.map(field => <fieldset key={field.key}>
        <legend>板块 {field.name + 1}</legend>
        <Form.Item name={[field.name, 'id']} hidden><Input /></Form.Item>
        <Form.Item name={[field.name, 'title']} label="板块名称" rules={[{ required: true, whitespace: true, max: 32 }]}><Input maxLength={32} /></Form.Item>
        <Form.Item name={[field.name, 'description']} label="板块介绍" rules={[{ required: true, whitespace: true, max: 200 }]}><Input.TextArea rows={2} maxLength={200} showCount /></Form.Item>
      </fieldset>)}</Form.List>
      <Form.Item name={['introduction', 'note']} label="来源说明" rules={[{ max: 120 }]}><Input maxLength={120} /></Form.Item>
      <Button type="primary" htmlType="submit" loading={saving}>保存栏目简介</Button>
    </Form>
  </div>
}
