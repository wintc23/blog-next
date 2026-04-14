'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { createLowlight, all } from 'lowlight'
import { useEffect } from 'react'
import { App, Button, Space, Tooltip } from 'antd'
import {
  BoldOutlined,
  ItalicOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  CodeOutlined,
  PictureOutlined,
  LinkOutlined,
  UndoOutlined,
  RedoOutlined,
} from '@ant-design/icons'
import { uploadToQiniu } from '@/lib/upload'

const lowlight = createLowlight(all)

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

function Toolbar({ editor }: { editor: Editor | null }) {
  const { message } = App.useApp()
  if (!editor) return null

  const insertImage = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const url = await uploadToQiniu(file)
        editor.chain().focus().setImage({ src: url }).run()
      } catch {
        message.error('图片上传失败')
      }
    }
    input.click()
  }

  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('链接地址', prev || 'https://')
    if (url === null) return
    if (!url) {
      editor.chain().focus().unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className="shrink-0 border-b border-[#eee] bg-[#fafafa] px-2 py-2">
      <Space size={4} wrap>
        <Tooltip title="撤销">
          <Button
            size="small"
            icon={<UndoOutlined />}
            onClick={() => editor.chain().focus().undo().run()}
          />
        </Tooltip>
        <Tooltip title="重做">
          <Button
            size="small"
            icon={<RedoOutlined />}
            onClick={() => editor.chain().focus().redo().run()}
          />
        </Tooltip>
        <Button
          size="small"
          type={editor.isActive('heading', { level: 2 }) ? 'primary' : 'default'}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </Button>
        <Button
          size="small"
          type={editor.isActive('heading', { level: 3 }) ? 'primary' : 'default'}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </Button>
        <Button
          size="small"
          type={editor.isActive('heading', { level: 4 }) ? 'primary' : 'default'}
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
        >
          H4
        </Button>
        <Button
          size="small"
          type={editor.isActive('bold') ? 'primary' : 'default'}
          icon={<BoldOutlined />}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <Button
          size="small"
          type={editor.isActive('italic') ? 'primary' : 'default'}
          icon={<ItalicOutlined />}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <Button
          size="small"
          type={editor.isActive('bulletList') ? 'primary' : 'default'}
          icon={<UnorderedListOutlined />}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <Button
          size="small"
          type={editor.isActive('orderedList') ? 'primary' : 'default'}
          icon={<OrderedListOutlined />}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <Button
          size="small"
          type={editor.isActive('blockquote') ? 'primary' : 'default'}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          引用
        </Button>
        <Button
          size="small"
          type={editor.isActive('codeBlock') ? 'primary' : 'default'}
          icon={<CodeOutlined />}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        />
        <Button size="small" icon={<PictureOutlined />} onClick={insertImage}>
          图片
        </Button>
        <Button size="small" icon={<LinkOutlined />} onClick={setLink}>
          链接
        </Button>
      </Space>
    </div>
  )
}

export default function TiptapEditor({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Image.configure({ inline: false, HTMLAttributes: { class: 'max-w-full h-auto' } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-[#4791ff] underline' } }),
      Placeholder.configure({ placeholder: placeholder || '开始写作…' }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: value || '',
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'markdown-body min-h-full focus:outline-none',
      },
      handlePaste(view, event) {
        const items = event.clipboardData?.items
        if (!items) return false
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile()
            if (!file) continue
            event.preventDefault()
            uploadToQiniu(file)
              .then((url) => {
                editor?.chain().focus().setImage({ src: url }).run()
              })
              .catch(() => {})
            return true
          }
        }
        return false
      },
    },
  })

  useEffect(() => {
    if (!editor) return
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || '', false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div className="flex h-full flex-col rounded border border-[#d9d9d9] bg-white">
      <Toolbar editor={editor} />
      {/* Clicking anywhere in the scroll area (padding, whitespace below the
          last block) focuses the editor at the end of the document. Without
          this, clicks miss the ProseMirror node and nothing happens. */}
      <div
        className="flex-1 cursor-text overflow-auto p-4"
        onClick={(e) => {
          if (!editor || editor.isFocused) return
          if ((e.target as HTMLElement).closest('.ProseMirror')) return
          editor.chain().focus('end').run()
        }}
      >
        <EditorContent editor={editor} className="min-h-full" />
      </div>
    </div>
  )
}
