'use client'

import {
  App,
  Button,
  Input,
  Modal,
  Select,
  Checkbox,
  Switch,
  Tag,
  Upload,
} from 'antd'
import {
  PlusOutlined,
  LoadingOutlined,
  DoubleLeftOutlined,
  SettingOutlined,
  EyeOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import { SITE } from '@/lib/config'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import BlockNoteEditor, {
  type BlockNoteEditorRef,
} from '@/components/BlockNoteEditor'
import Keywords from '@/components/Keywords'
import { getPost, getPostType } from '@/lib/api/posts'
import { savePostAction } from '@/app/actions/posts'
import { getTagList } from '@/lib/api/tags'
import { getTopicList } from '@/lib/api/topics'
import { uploadToQiniu } from '@/lib/upload'
import { formatTime } from '@/lib/utils'
import type { Post, PostType, Tag as TagType, Topic } from '@/lib/types'

type PostFull = Post

export default function ManageArticleEditorClient() {
  const router = useRouter()
  const sp = useSearchParams()
  const postId = sp?.get('postId')
  const { message } = App.useApp()

  const [postData, setPostData] = useState<PostFull | null>(null)
  const [showSetting, setShowSetting] = useState(false)
  const [types, setTypes] = useState<PostType[]>([])
  const [tagList, setTagList] = useState<TagType[]>([])
  const [topicList, setTopicList] = useState<Topic[]>([])
  const [uploading, setUploading] = useState(false)
  // Default ON to match blog-ssr's behaviour (watermark toolbar toggle
  // defaulted to enabled on the old TinyMCE editor).
  const [watermark, setWatermark] = useState(true)
  // Track local save state so the header can display 待保存 / 保存中 /
  // 已保存. Three exclusive states driven by `dirty` and `saving`.
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const editorRef = useRef<BlockNoteEditorRef | null>(null)
  const titleRef = useRef<HTMLInputElement | null>(null)
  // Watermark handler reads `watermark` + `postData.id` at call time — keep
  // the latest values in a ref so the `uploadFile` function identity stays
  // stable across renders (otherwise BlockNote would recreate its upload
  // pipeline on every state change).
  const watermarkRef = useRef(watermark)
  const postIdRef = useRef<number | null>(null)
  watermarkRef.current = watermark
  postIdRef.current = postData?.id ?? null

  const update = useCallback((patch: Partial<PostFull>) => {
    setPostData((p) => (p ? { ...p, ...patch } : p))
    setDirty(true)
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
      if (!postData) return { ok: false as const, error: '文章未加载' }
      setSaving(true)
      const r = await savePostAction(
        postData as unknown as Record<string, unknown>,
      )
      setSaving(false)
      if (r.ok) {
        setDirty(false)
        if (!silent) message.success('保存成功')
      } else {
        if (!silent) message.error(r.error || '保存失败')
      }
      return r
    },
    [postData, message],
  )

  // Save the current draft before navigating away (back to list or to
  // the article preview page) so the user never loses edits. Skip the
  // round-trip if there's nothing dirty — no point calling the save
  // endpoint when the local state already matches the server.
  const saveThen = useCallback(
    async (dest: string) => {
      if (!dirty) {
        router.push(dest)
        return
      }
      const r = await doSave(true)
      if (!r.ok) {
        message.error(r.error || '保存失败')
        return
      }
      router.push(dest)
    },
    [dirty, doSave, router, message],
  )
  const goBack = useCallback(() => saveThen('/manage'), [saveThen])
  const goPreview = useCallback(() => {
    if (!postData) return
    saveThen(`/article/${postData.id}`)
  }, [saveThen, postData])

  // Debounced autosave: 3 seconds after the user stops editing. The effect
  // re-subscribes on every change to `postData`; while dirty is true, the
  // cleanup cancels the previous timer so only the last edit's timer fires.
  useEffect(() => {
    if (!dirty) return
    const t = setTimeout(() => {
      doSave(true)
    }, 3000)
    return () => clearTimeout(t)
  }, [postData, dirty, doSave])

  // Watermark pipeline:
  //   1. Tile the site name across the entire image at -25° in light grey
  //      (low alpha) so it survives crops and screenshots.
  //   2. Stamp the article URL in the bottom-right corner in a slightly
  //      darker yellow so it's still legible without dominating.
  // Disabled toggle or non-image files bypass watermarking entirely.
  const uploadEditorFile = useCallback(async (file: File): Promise<string> => {
    if (!watermarkRef.current || !file.type.startsWith('image/')) {
      return uploadToQiniu(file)
    }
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = reject
      el.src = dataUrl
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return uploadToQiniu(file)
    ctx.drawImage(img, 0, 0)

    // ---- Tiled diagonal site-name watermark ----
    const tileFontSize = Math.max(canvas.width / 28, 18)
    ctx.save()
    ctx.font = `${tileFontSize}px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)'
    ctx.lineWidth = 1
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    // Rotate the whole canvas; draw text on a grid wider than the image
    // so the rotated tiles still cover every corner.
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((-25 * Math.PI) / 180)
    const stepX = tileFontSize * 9
    const stepY = tileFontSize * 5
    const reach = Math.max(canvas.width, canvas.height) * 1.2
    for (let y = -reach; y <= reach; y += stepY) {
      // Stagger every other row by half a step so the pattern doesn't
      // line up into vertical stripes.
      const offset = (Math.round(y / stepY) % 2) * (stepX / 2)
      for (let x = -reach + offset; x <= reach; x += stepX) {
        ctx.strokeText(SITE.title, x, y)
        ctx.fillText(SITE.title, x, y)
      }
    }
    ctx.restore()

    // ---- Bottom-right two-line stamp (site title + article URL) ----
    // Same dark-stroke + bright-fill technique as before for crisp text
    // on any background, no blur. Mirrors blog-ssr's original watermark
    // layout (site title above the URL).
    const url =
      postIdRef.current != null
        ? `${window.location.origin}/article/${postIdRef.current}`
        : window.location.origin
    const stampSize = Math.max(canvas.width / 70, 14)
    const stampGap = Math.round(stampSize * 0.4)
    ctx.font = `600 ${stampSize}px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'right'
    ctx.textBaseline = 'alphabetic'
    ctx.lineJoin = 'round'
    ctx.miterLimit = 2
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)'
    ctx.lineWidth = Math.max(stampSize / 6, 2)
    const xRight = canvas.width - 12
    const yBottom = canvas.height - 12
    const yTop = yBottom - stampSize - stampGap
    // Site title on the upper line
    ctx.strokeText(SITE.title, xRight, yTop)
    ctx.fillStyle = '#FFC82C'
    ctx.fillText(SITE.title, xRight, yTop)
    // Article URL on the lower line
    ctx.strokeText(url, xRight, yBottom)
    ctx.fillText(url, xRight, yBottom)

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))))
    })
    return uploadToQiniu(blob)
  }, [])

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
      {/* Full-width editor header: left — back-to-list + created/save
          status; right — watermark toggle then action buttons. The back
          action always saves silently before navigating so the user never
          loses work. */}
      <div className="flex shrink-0 items-center gap-3 border-b border-[#e5e6eb] bg-white px-4 py-2">
        <Button type="text" icon={<DoubleLeftOutlined />} onClick={goBack}>
          返回
        </Button>
        <div className="mx-1 h-5 w-px bg-[#e5e6eb]" />
        <div className="flex flex-col justify-center text-xs leading-tight text-[#86909c]">
          <span>创建于 {formatTime(postData.timestamp)}</span>
          <span>
            {saving ? (
              <span className="text-[#3361d8]">● 保存中</span>
            ) : dirty ? (
              <span className="text-[#f5a524]">● 待保存</span>
            ) : (
              <span className="text-[#19be6b]">● 已保存</span>
            )}
          </span>
        </div>
        <div className="flex-1" />
        <label className="flex select-none items-center gap-1.5 text-sm text-[#4e5969]">
          <Switch size="small" checked={watermark} onChange={setWatermark} />
          图片水印
        </label>
        <div className="mx-1 h-5 w-px bg-[#e5e6eb]" />
        <Button
          icon={<SettingOutlined />}
          onClick={() => setShowSetting(true)}
        >
          设置
        </Button>
        <Button icon={<EyeOutlined />} onClick={goPreview}>
          预览
        </Button>
        <Button type="primary" icon={<SaveOutlined />} onClick={() => doSave()}>
          保存
        </Button>
      </div>
      {/* Large borderless document title centered above the editor, sharing
          its horizontal padding so the caret lines up with body text. The
          flex-col column with `flex-1` on the editor wrapper lets clicks in
          the blank area below the last block route to the editor's
          focusEnd() via ref. */}
      <div
        className="scroll-thin min-h-0 flex-1 cursor-text overflow-auto"
        style={{ scrollbarGutter: 'stable' }}
        onClick={(e) => {
          // Only the outermost scroll container itself — clicking on a
          // child (title input, editor block, etc.) is handled normally.
          if (e.target === e.currentTarget) editorRef.current?.focusEnd()
        }}
      >
        <div
          className="mx-auto flex min-h-full max-w-[900px] flex-col pt-10"
          onClick={(e) => {
            // Clicking in the blank column area (outside any block or the
            // title input) jumps the cursor to the end of the document.
            const t = e.target as HTMLElement
            if (t === e.currentTarget) editorRef.current?.focusEnd()
          }}
        >
          {/* Title is indented to match BlockNote's `.bn-editor` inline
              padding (54px) so the caret lines up with body block content
              instead of the side-menu gutter. */}
          <input
            ref={titleRef}
            value={postData.title || ''}
            onChange={(e) => update({ title: e.target.value })}
            onKeyDown={(e) => {
              // ArrowDown from the single-line title drops focus into the
              // body editor. Enter also does this — feels natural when
              // the user is setting up a new article top-to-bottom.
              if (e.key === 'ArrowDown' || e.key === 'Enter') {
                e.preventDefault()
                editorRef.current?.focusStart()
              }
            }}
            placeholder="无标题"
            className="w-full shrink-0 border-none bg-transparent px-[54px] text-[36px] font-bold leading-[1.3] text-[#1f2329] outline-none placeholder:text-[#bbbfc4]"
          />
          <div
            className="mt-4 flex-1 pb-20"
            onClick={(e) => {
              // Only the bare wrapper itself (the empty area below the
              // last block) should retarget focus to the editor. Clicks
              // on any descendant — blocks, image/file/link panels,
              // suggestion menus, etc. — must be left alone so their
              // own handlers can run (e.g. image caption / rename).
              if (e.target !== e.currentTarget) return
              editorRef.current?.focusEnd()
            }}
          >
            <BlockNoteEditor
              ref={editorRef}
              value={postData.bodyHtml || ''}
              onChange={(html) => update({ bodyHtml: html })}
              uploadFile={uploadEditorFile}
              onEscapeTop={() => {
                const el = titleRef.current
                if (!el) return
                el.focus()
                const n = el.value.length
                el.setSelectionRange(n, n)
              }}
            />
          </div>
        </div>
      </div>

      <Modal
        open={showSetting}
        onCancel={() => setShowSetting(false)}
        onOk={() => setShowSetting(false)}
        title="文章设置"
        width="60%"
        centered
        // Pin the body to 70vh so the modal itself stays put and just the
        // form content scrolls when it overflows, instead of the whole
        // modal growing past the viewport. `scroll-thin` on the body
        // reuses the site's overlay scrollbar style.
        classNames={{ body: 'scroll-thin' }}
        styles={{
          body: {
            maxHeight: '70vh',
            overflowY: 'auto',
          },
        }}
      >
        <div className="space-y-4 pr-2">
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
