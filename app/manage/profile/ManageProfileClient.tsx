'use client'

import { Alert, App, Button, Form, Input, Select, Spin, Upload } from 'antd'
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, PlusOutlined, SaveOutlined, UploadOutlined } from '@ant-design/icons'
import { useCallback, useEffect, useState } from 'react'
import { getPersonalProfile, savePersonalProfile } from '@/lib/api/personal-profile'
import type { PersonalProfileInput } from '@/lib/schemas/personal-profile'
import { PROFILE_LINK_ICONS } from '@/lib/schemas/personal-profile'
import { uploadToQiniu } from '@/lib/upload'
import styles from './ProfileEditor.module.css'

const EMPTY_PROFILE: PersonalProfileInput = {
  displayName: '', avatarUrl: '', tagline: '', introduction: '', bio: '', links: [],
  contactEmail: '', wechatId: '', wechatQrUrl: '', contactNote: '',
}

export default function ManageProfileClient() {
  const { message } = App.useApp()
  const [form] = Form.useForm<PersonalProfileInput>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const avatarUrl = Form.useWatch('avatarUrl', form)
  const wechatQrUrl = Form.useWatch('wechatQrUrl', form)

  const uploadImage = async (file: File, field: 'avatarUrl' | 'wechatQrUrl') => {
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      message.error('请选择不超过 5 MB 的图片')
      return Upload.LIST_IGNORE
    }
    setUploading(true)
    try {
      const url = await uploadToQiniu(file)
      // A value update avoids rc-field-form's shared empty-error metadata warning.
      form.setFieldsValue({ [field]: url })
    } catch {
      message.error('图片上传失败，请重试')
    } finally {
      setUploading(false)
    }
    return Upload.LIST_IGNORE
  }

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      form.setFieldsValue(await getPersonalProfile())
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '加载个人信息失败')
    } finally {
      setLoading(false)
    }
  }, [form])

  useEffect(() => { load() }, [load])

  const save = async (values: PersonalProfileInput) => {
    setSaving(true)
    try {
      form.setFieldsValue(await savePersonalProfile(values))
      message.success('个人信息已保存，刷新首页即可看到更新')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.editor}>
      <header className={styles.heading}>
        <div>
          <h1>个人信息</h1>
          <p>编辑首页的个人介绍、生活动态、联系卡片和链接。</p>
        </div>
        <Button href="/" target="_blank" rel="noreferrer">预览首页</Button>
      </header>
      {loadError ? (
        <Alert type="error" showIcon message="加载个人信息失败" description={loadError}
          action={<Button onClick={load}>重新加载</Button>} />
      ) : (
        <Spin spinning={loading}>
          <Form<PersonalProfileInput>
            form={form} name="personal-profile" layout="vertical" size="large"
            initialValues={EMPTY_PROFILE} onFinish={save} validateTrigger="onBlur"
            disabled={loading || saving || uploading} scrollToFirstError
          >
            <fieldset className={styles.section}>
              <legend>基本信息</legend>
              <Form.Item name="displayName" label="显示名称" rules={[{ required: true, whitespace: true, message: '请填写显示名称' }]}>
                <Input name="displayName" autoComplete="nickname" maxLength={128} />
              </Form.Item>
              <Form.Item label="头像地址" name="avatarUrl" rules={[{ type: 'url', message: '请填写完整的 http 或 https 图片地址' }]}>
                <Input name="avatarUrl" type="url" maxLength={2048} />
              </Form.Item>
              <div className={styles.avatarTools}>
                {avatarUrl && /^https?:\/\//i.test(avatarUrl) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="头像预览" width={64} height={64} />
                )}
                <Upload accept="image/*" showUploadList={false} disabled={loading || saving || uploading}
                  beforeUpload={(file) => uploadImage(file, 'avatarUrl')}
                >
                  <Button icon={<UploadOutlined />} loading={uploading}>上传头像</Button>
                </Upload>
              </div>
              <Form.Item label="一句话简介" name="tagline" extra="显示在姓名下方，可留空。">
                <Input name="tagline" maxLength={255} />
              </Form.Item>
            </fieldset>
            <fieldset className={styles.section}>
              <legend>个人介绍</legend>
              <Form.Item label="介绍开头" name="introduction" extra="用一句简短的话介绍自己，会以稍大的字号显示。">
                <Input.TextArea name="introduction" rows={2} maxLength={500} />
              </Form.Item>
              <Form.Item label="介绍正文" name="bio" extra="可以写兴趣、近况或网站介绍。段落之间空一行，首页会保留分段。">
                <Input.TextArea name="bio" rows={7} maxLength={10000} showCount />
              </Form.Item>
            </fieldset>
            <fieldset id="life-moments" className={styles.section}>
              <legend>生活动态</legend>
              <p className={styles.help}>每条动态独立发布，历史内容会一直保留。</p>
              <Button href="/manage/moments">管理生活动态</Button>
            </fieldset>
            <fieldset className={styles.section}>
              <legend>联系卡片</legend>
              <p className={styles.help}>点击“联系我”后展示。未填写的联系方式不会显示。</p>
              <Form.Item label="联系说明" name="contactNote">
                <Input.TextArea name="contactNote" rows={2} maxLength={500} />
              </Form.Item>
              <Form.Item label="联系邮箱" name="contactEmail" rules={[{ type: 'email', message: '请填写有效的邮箱地址' }]}>
                <Input name="contactEmail" type="email" autoComplete="email" maxLength={254} />
              </Form.Item>
              <Form.Item label="微信号" name="wechatId">
                <Input name="wechatId" maxLength={128} />
              </Form.Item>
              <Form.Item label="微信二维码地址" name="wechatQrUrl" rules={[{ type: 'url', message: '请填写完整的图片地址' }]}>
                <Input name="wechatQrUrl" type="url" maxLength={2048} />
              </Form.Item>
              <div className={styles.qrTools}>
                {wechatQrUrl && /^https?:\/\//i.test(wechatQrUrl) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={wechatQrUrl} alt="微信二维码预览" width={140} height={140} />
                )}
                <Upload accept="image/*" showUploadList={false} disabled={loading || saving || uploading}
                  beforeUpload={(file) => uploadImage(file, 'wechatQrUrl')}>
                  <Button icon={<UploadOutlined />} loading={uploading}>上传微信二维码</Button>
                </Upload>
              </div>
            </fieldset>
            <fieldset className={styles.section}>
              <legend>学校、公司与页面链接</legend>
              <p className={styles.help}>学校和公司显示在姓名下方、介绍正文之前，可选择对应 Logo，仅作展示。社区链接显示为带图标的按钮，普通链接显示为文字入口。每组内按下方顺序排列，最多 8 项。</p>
              <Form.List name="links">
                {(fields, { add, remove, move }) => (
                  <>
                    {fields.map((field, index) => (
                      <div className={styles.linkRow} key={field.key}>
                        <Form.Item name={[field.name, 'label']} label={`链接 ${index + 1} 名称`}
                          rules={[{ required: true, whitespace: true, message: '请填写链接名称' }]}>
                          <Input name={`link-label-${index}`} maxLength={60} />
                        </Form.Item>
                        <Form.Item name={[field.name, 'url']} label={`链接 ${index + 1} 地址`}
                          rules={[{ required: true, whitespace: true, message: '请填写链接地址' }]}>
                          <Input name={`link-url-${index}`} maxLength={2048} autoCapitalize="none" />
                        </Form.Item>
                        <Form.Item name={[field.name, 'group']} label={`链接 ${index + 1} 分组`}>
                          <Select options={[
                            { value: 'navigation', label: '普通链接' },
                            { value: 'community', label: '社区链接' },
                            { value: 'education', label: '学校' },
                            { value: 'work', label: '公司' },
                          ]} />
                        </Form.Item>
                        <Form.Item name={[field.name, 'icon']} label={`链接 ${index + 1} 图标`} extra="学校、公司和社区链接显示图标。">
                          <Select options={[...PROFILE_LINK_ICONS]} />
                        </Form.Item>
                        <div className={styles.linkActions}>
                          <Button aria-label={`上移链接 ${index + 1}`} icon={<ArrowUpOutlined />} disabled={loading || saving || uploading || index === 0} onClick={() => move(index, index - 1)} />
                          <Button aria-label={`下移链接 ${index + 1}`} icon={<ArrowDownOutlined />} disabled={loading || saving || uploading || index === fields.length - 1} onClick={() => move(index, index + 1)} />
                          <Button aria-label={`删除链接 ${index + 1}`} danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                        </div>
                      </div>
                    ))}
                    <Button type="dashed" icon={<PlusOutlined />} disabled={loading || saving || uploading || fields.length >= 8} onClick={() => add({ label: '', url: '', group: 'navigation', icon: 'link' })}>添加链接</Button>
                  </>
                )}
              </Form.List>
            </fieldset>
            <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />}>保存个人信息</Button>
          </Form>
        </Spin>
      )}
    </div>
  )
}
