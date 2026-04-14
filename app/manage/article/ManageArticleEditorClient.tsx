'use client'

import {
  App,
  Button,
  Input,
  Modal,
  Select,
  Checkbox,
  Tag,
  Upload,
} from 'antd'
import { PlusOutlined, LoadingOutlined } from '@ant-design/icons'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import TiptapEditor from '@/components/TiptapEditor'
import Keywords from '@/components/Keywords'
import { getPost, getPostType } from '@/lib/api/posts'
import { savePostAction } from '@/app/actions/posts'
import { getTagList } from '@/lib/api/tags'
import { getTopicList } from '@/lib/api/topics'
import { uploadToQiniu } from '@/lib/upload'
import type { Post, PostType, Tag as TagType, Topic } from '@/lib/types'

type PostFull = Post

export default function ManageArticleEditorClient() {
  const router = useRouter()
  const sp = useSearchParams()
  const postId = sp.get('postId')
  const { message } = App.useApp()

  const [postData, setPostData] = useState<PostFull | null>(null)
  const [showSetting, setShowSetting] = useState(false)
  const [types, setTypes] = useState<PostType[]>([])
  const [tagList, setTagList] = useState<TagType[]>([])
  const [topicList, setTopicList] = useState<Topic[]>([])
  const [uploading, setUploading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const update = useCallback((patch: Partial<PostFull>) => {
    setPostData((p) => (p ? { ...p, ...patch } : p))
  }, [])

  useEffect(() => {
    if (!postId) return
    getPost(postId)
      .then((data) => setPostData(data))
      .catch(() => message.error('加载文章失败'))
  }, [postId, message])

  useEffect(() => {
    getPostType()
      .then((r) => setTypes(r.list || []))
      .catch(() => {})
    getTagList()
      .then((r) => setTagList(r.list || []))
      .catch(() => {})
    getTopicList()
      .then((r) => setTopicList(r.list || []))
      .catch(() => {})
  }, [])

  const doSave = useCallback(
    async (silent = false) => {
      if (!postData) return
      const r = await savePostAction(
        postData as unknown as Record<string, unknown>,
      )
      if (r.ok) {
        if (!silent) message.success('保存成功')
      } else {
        if (!silent) message.error(r.error || '保存失败')
      }
    },
    [postData, message],
  )

  useEffect(() => {
    timerRef.current = setInterval(() => doSave(true), 60 * 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [doSave])

  if (!postData) {
    return <div className="p-10 text-center text-[#666]">加载中…</div>
  }

  const toggleTag = (id: number) => {
    const arr = postData.tags || []
    const idx = arr.indexOf(id)
    if (idx !== -1) arr.splice(idx, 1)
    else arr.push(id)
    update({ tags: [...arr] })
  }

  const uploadCover = async (file: File) => {
    setUploading(true)
    try {
      const url = await uploadToQiniu(file)
      update({ abstractImage: url })
    } catch {
      message.error('上传失败')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-[#eee] p-3">
        <Input
          value={postData.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="请输入文章标题"
          className="flex-1"
        />
        <Button onClick={() => setShowSetting(true)}>文章设置</Button>
        <Button type="primary" onClick={() => doSave()}>
          保存
        </Button>
        <Button onClick={() => router.push(`/article/${postData.id}`)}>预览</Button>
      </div>
      <div className="min-h-0 flex-1 p-3">
        <TiptapEditor
          value={postData.bodyHtml || ''}
          onChange={(html) => update({ bodyHtml: html })}
        />
      </div>

      <Modal
        open={showSetting}
        onCancel={() => setShowSetting(false)}
        onOk={() => setShowSetting(false)}
        title="文章设置"
        width="60%"
      >
        <div className="space-y-4">
          <div>
            <div className="mb-1 font-bold text-[#3361d8]">是否隐藏</div>
            <Checkbox
              checked={postData.hide || false}
              onChange={(e) => update({ hide: e.target.checked })}
            >
              隐藏
            </Checkbox>
          </div>
          <div>
            <div className="mb-1 font-bold text-[#3361d8]">专题</div>
            <Select
              value={postData.topicId}
              onChange={(v) => update({ topicId: v })}
              style={{ width: '100%' }}
              options={topicList.map((t) => ({ value: t.id, label: t.title }))}
              allowClear
            />
          </div>
          <div>
            <div className="mb-1 font-bold text-[#3361d8]">标签</div>
            <div className="flex flex-wrap gap-2">
              {tagList
                .filter((t) => t.title)
                .map((tag) => (
                  <Tag.CheckableTag
                    key={tag.id}
                    checked={(postData.tags || []).includes(tag.id)}
                    onChange={() => toggleTag(tag.id)}
                  >
                    {tag.title}
                  </Tag.CheckableTag>
                ))}
            </div>
          </div>
          <div>
            <div className="mb-1 font-bold text-[#3361d8]">关键词</div>
            <Keywords
              value={postData.keywords || ''}
              onChange={(v) => update({ keywords: v })}
            />
          </div>
          <div>
            <div className="mb-1 font-bold text-[#3361d8]">描述</div>
            <Input.TextArea
              value={postData.description || ''}
              maxLength={128}
              onChange={(e) => update({ description: e.target.value })}
            />
          </div>
          <div>
            <div className="mb-1 font-bold text-[#3361d8]">摘要</div>
            <Input.TextArea
              value={postData.abstract || ''}
              onChange={(e) => update({ abstract: e.target.value })}
            />
          </div>
          <div>
            <div className="mb-1 font-bold text-[#3361d8]">文章分类</div>
            <Select
              value={postData.typeId}
              onChange={(v) => update({ typeId: v })}
              style={{ width: '100%' }}
              options={types.map((t) => ({ value: t.id, label: t.name }))}
            />
          </div>
          <div>
            <div className="mb-1 font-bold text-[#3361d8]">文章缩略图</div>
            <Upload
              accept="image/png,image/jpeg,image/gif"
              listType="picture-card"
              showUploadList={false}
              beforeUpload={(file) => {
                uploadCover(file)
                return false
              }}
            >
              {postData.abstractImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={postData.abstractImage}
                  alt="cover"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center text-[#666]">
                  {uploading ? <LoadingOutlined /> : <PlusOutlined />}
                  <div className="mt-1 text-xs">上传</div>
                </div>
              )}
            </Upload>
            {postData.abstractImage && (
              <Button
                size="small"
                className="mt-2"
                onClick={() => update({ abstractImage: '' })}
              >
                移除
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
