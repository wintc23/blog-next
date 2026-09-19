'use client'

import { useAuthenticatedAction } from '@/lib/use-authenticated-action'
import { App, Button, Input, Modal } from 'antd'
import { LinkOutlined } from '@ant-design/icons'
import { BubbleMenu, EditorContent, useEditor } from '@tiptap/react'
import { Extension } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import type { ReactNode } from 'react'
import { CommentLink, commentDocument, commentText } from '@/lib/comment-editor'
import styles from './CommentInput.module.css'
import { useEffect, useId, useRef, useState } from 'react'
import { useUser, useShowLogin, useShowUserDrawer } from '@/lib/store'
import { uploadImage } from '@/lib/upload'
import { safeLink, splitCommentBody, joinCommentBody } from '@/lib/rich-content'
import CommentImages from './CommentImages'

interface Props {
  quickLogin?: boolean
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  compact?: boolean
  onBusyChange?: (busy: boolean) => void
  actions?: ReactNode
}

export default function CommentInput({ quickLogin = false, value, onChange, placeholder, rows = 4, compact = false, onBusyChange, actions }: Props) {
  const user = useUser()
  const authenticate = useAuthenticatedAction()
  const showLogin = useShowLogin()
  const showUserDrawer = useShowUserDrawer()
  const waitingForLogin = useRef(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const selection = useRef({ from: 1, to: 1 })
  const { message } = App.useApp()
  const latestValue = useRef(value)
  latestValue.current = value
  const uploadRequest = useRef(false)
  const mounted = useRef(true)
  const draft = splitCommentBody(value)
  const linkId = useId()
  const textLimit = useRef(user?.isGuest ? 2000 : 5000)
  textLimit.current = user?.isGuest ? 2000 : 5000

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      Extension.create({
        name: 'commentLength',
        addProseMirrorPlugins: () => [new Plugin({
          filterTransaction: (transaction, state) => {
            if (!transaction.docChanged) return true
            const size = (doc: typeof state.doc) => doc.textBetween(0, doc.content.size, '\n').length
            if (size(transaction.doc) <= textLimit.current || size(transaction.doc) <= size(state.doc)) return true
            queueMicrotask(() => message.warning({ content: `最多输入 ${textLimit.current} 个字`, key: 'comment-length' }))
            return false
          },
        })],
      }),
      StarterKit.configure({ heading: false, bulletList: false, orderedList: false, listItem: false, blockquote: false, code: false, codeBlock: false, horizontalRule: false, italic: false, strike: false }),
      CommentLink,
      Placeholder.configure({ placeholder: placeholder || '写下你的想法…', showOnlyWhenEditable: false }),
    ],
    content: commentDocument(draft.text),
    editable: !!user?.id && !uploading,
    editorProps: {
      attributes: { role: 'textbox', 'aria-multiline': 'true', 'aria-label': placeholder || '评论内容' },
      handlePaste: (_view, event) => {
        const image = Array.from(event.clipboardData?.items || []).find((item) => item.kind === 'file' && item.type.startsWith('image/'))
        if (!image) return false
        event.preventDefault()
        void upload(image.getAsFile() || undefined)
        return true
      },
      handleKeyDown: (_view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
          event.preventDefault()
          openLink()
          return true
        }
        return false
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(joinCommentBody(commentText(current.getJSON()), splitCommentBody(latestValue.current).images))
    },
  })

  useEffect(() => { editor?.setEditable(!!user?.id && !uploading) }, [editor, user?.id, uploading])
  useEffect(() => {
    if (editor && commentText(editor.getJSON()) !== draft.text) {
      // Compare parsed documents too: bare URLs and explicit links are equivalent.
      if (JSON.stringify(commentDocument(draft.text)) !== JSON.stringify(commentDocument(commentText(editor.getJSON())))) {
        editor.commands.setContent(commentDocument(draft.text), false)
      }
    }
  }, [editor, draft.text])

  const openLink = () => {
    if (!editor || !user?.id || uploading) return
    if (editor.isActive('link')) editor.commands.extendMarkRange('link')
    const { from, to } = editor.state.selection
    if (from === to) { message.info('先选中文字，再插入链接'); return }
    const text = editor.state.doc.textBetween(from, to, '\n')
    if (/[\]\n]/.test(text)) { message.info('请选择同一行文字，且不要包含右方括号'); return }
    selection.current = { from, to }
    setLinkUrl(editor.getAttributes('link').href || '')
    setLinkOpen(true)
  }

  const upload = async (file?: File) => {
    if (!file || uploadRequest.current) return
    if (!user?.id) { startLogin(); return }
    if ((latestValue.current.match(/!\[[^\]]*\]\(/g) || []).length >= 6) {
      message.info('每条内容最多 6 张图片')
      return
    }
    uploadRequest.current = true
    setUploading(true)
    onBusyChange?.(true)
    try {
      const url = await uploadImage(file)
      if (mounted.current) {
        const caption = file.name.replace(/[\[\]\r\n]/g, '').slice(0, 80) || '图片'
        const current = splitCommentBody(latestValue.current)
        onChange(joinCommentBody(current.text, [...current.images, { url, alt: caption }]))
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '图片上传失败')
    } finally {
      uploadRequest.current = false
      if (mounted.current) { setUploading(false); onBusyChange?.(false) }
    }
  }

  useEffect(() => {
    const resumeInput = (event: Event) => {
      if (waitingForLogin.current) {
        waitingForLogin.current = false
        if ((event as CustomEvent<boolean>).detail) editor?.commands.focus(undefined, { scrollIntoView: false })
      }
    }
    window.addEventListener('site-login-closed', resumeInput)
    return () => window.removeEventListener('site-login-closed', resumeInput)
  }, [editor])

  const startLogin = () => {
    waitingForLogin.current = true
    if (quickLogin) {
      void authenticate(async () => undefined).catch(error => {
        waitingForLogin.current = false
        message.error(error instanceof Error ? error.message : '登录失败，请重试')
      })
    } else showLogin()
  }

  return (
    <>
      <div className={`${styles.composer} ${compact ? styles.compact : ''}`}>
        {!compact && <div className={styles.identity}>
          <button type="button" className={styles.avatar} aria-label={user?.id ? '查看我的信息' : '登录'} onClick={() => user?.id ? showUserDrawer(user.id) : startLogin()}>
            {user?.id ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar} alt="" />
            ) : <span>登录</span>}
          </button>
          <span>{user?.username || '来聊聊吧'}</span>
        </div>}
        <div className={styles.writing} style={{ '--editor-rows': rows } as React.CSSProperties} onClick={() => { if (!user?.id) startLogin() }}>
          <EditorContent editor={editor} />
          {!user?.id && <button type="button" className={styles.loginOverlay} aria-label="登录后发表评论" onClick={(event) => { event.stopPropagation(); startLogin() }} />}
        </div>
        {editor && <BubbleMenu editor={editor} tippyOptions={{ duration: 100, placement: 'top' }} shouldShow={({ editor: current, from, to }) => current.isEditable && !linkOpen && (from !== to || current.isActive('link'))}>
          <div className={styles.selectionTools} role="group" aria-label="文字链接">
            <button type="button" onClick={openLink}><LinkOutlined />{editor.isActive('link') ? '编辑链接' : '插入链接'}</button>
            {editor.isActive('link') && <button type="button" onClick={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()}>移除链接</button>}
          </div>
        </BubbleMenu>}
        <div className={styles.attachments}>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" aria-label="上传评论图片" onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = '' }} />
          <CommentImages images={draft.images} disabled={uploading} uploading={uploading}
            onAdd={() => user?.id ? fileInput.current?.click() : startLogin()}
            onChange={(images) => onChange(joinCommentBody(splitCommentBody(latestValue.current).text, images))} />
        </div>
        <div className={styles.footer}>
          <div className={styles.actions}>{actions}</div>
        </div>
      </div>
      <Modal title="插入链接" open={linkOpen} onCancel={() => setLinkOpen(false)} afterClose={() => editor?.commands.focus(undefined, { scrollIntoView: false })} footer={null} width={360} centered>
        <form onSubmit={(event) => {
          event.preventDefault()
          if (!safeLink(linkUrl.trim())) { message.error('请输入完整的 http 或 https 链接'); return }
          editor?.chain().focus().setTextSelection(selection.current).unsetBold().setLink({ href: linkUrl.trim() }).run()
          setLinkOpen(false)
        }}>
          <label htmlFor={`${linkId}-url`} className="mb-2 block">链接地址</label>
          <Input id={`${linkId}-url`} type="url" required value={linkUrl} placeholder="https://" onChange={(event) => setLinkUrl(event.target.value)} autoFocus />
          <Button className="mt-4" type="primary" htmlType="submit" block>保存</Button>
        </form>
      </Modal>
    </>
  )
}
