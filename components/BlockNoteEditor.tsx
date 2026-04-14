'use client'

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react'
import { BlockNoteView } from '@blocknote/mantine'
import {
  useCreateBlockNote,
  SideMenu,
  SideMenuController,
  DragHandleButton,
  SuggestionMenuController,
} from '@blocknote/react'
import type { Block } from '@blocknote/core'
import { zh } from '@blocknote/core/locales'
import { flip, offset, shift, size } from '@floating-ui/react'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  /**
   * Hook for image/file uploads inside the editor. When provided, BlockNote
   * uses it for paste/drop/insert operations on image blocks so the parent
   * can add its own pre-processing (e.g. watermarking) before sending the
   * file to the backing storage.
   */
  uploadFile?: (file: File) => Promise<string>
}

/**
 * Imperative handle for the parent so it can route blank-area clicks in the
 * surrounding layout to focus the end of the document. Needed because the
 * editor itself only occupies its content height — blank space below it
 * lives in the parent's flex layout.
 */
export interface BlockNoteEditorRef {
  focusEnd: () => void
}

/**
 * BlockNote-based editor — drop-in replacement for TiptapEditor. BlockNote
 * is built on top of Tiptap and provides the Notion/飞书-style experience
 * out of the box: slash menu, drag handles, bubble menu, nested blocks.
 *
 * The backend contract is unchanged — we still serialize to/from an HTML
 * string via BlockNote's HTML helpers, keeping the existing `bodyHtml`
 * field working without a migration.
 */
const BlockNoteEditor = forwardRef<BlockNoteEditorRef, Props>(
  function BlockNoteEditor({ value, onChange, placeholder, uploadFile }, ref) {
    const [initialBlocks, setInitialBlocks] = useState<Block[] | undefined | null>(null)

    // Parse the inbound HTML into BlockNote blocks once, before creating the
    // editor. `useCreateBlockNote`'s `initialContent` must be set at creation
    // time and can't be updated later.
    useEffect(() => {
      let cancelled = false
      const parse = async () => {
        if (!value) {
          if (!cancelled) setInitialBlocks(undefined)
          return
        }
        const { BlockNoteEditor: Core } = await import('@blocknote/core')
        const scratch = Core.create()
        const blocks = await scratch.tryParseHTMLToBlocks(value)
        if (!cancelled) setInitialBlocks(blocks)
      }
      parse()
      return () => {
        cancelled = true
      }
      // Only on mount — after that the editor owns the document state.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    if (initialBlocks === null) {
      return <div className="p-4 text-sm text-[#999]">加载编辑器…</div>
    }

    return (
      <EditorInner
        initialContent={initialBlocks}
        onChange={onChange}
        placeholder={placeholder}
        uploadFile={uploadFile}
        forwardedRef={ref}
      />
    )
  },
)

export default BlockNoteEditor

function EditorInner({
  initialContent,
  onChange,
  placeholder,
  uploadFile,
  forwardedRef,
}: {
  initialContent: Block[] | undefined
  onChange: (html: string) => void
  placeholder?: string
  uploadFile?: (file: File) => Promise<string>
  forwardedRef: React.Ref<BlockNoteEditorRef>
}) {
  const editor = useCreateBlockNote({
    initialContent: initialContent && initialContent.length > 0 ? initialContent : undefined,
    dictionary: zh,
    uploadFile,
  })

  useImperativeHandle(
    forwardedRef,
    () => ({
      focusEnd: () => {
        if (!editor) return
        const doc = editor.document
        const last = doc[doc.length - 1]
        if (last) editor.setTextCursorPosition(last, 'end')
        editor.focus()
      },
    }),
    [editor],
  )

  useEffect(() => {
    if (!editor) return
    let timer: ReturnType<typeof setTimeout> | null = null
    const handler = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(async () => {
        // Use the full HTML exporter rather than the "lossy" one: the lossy
        // variant drops BlockNote-specific props (colors, alignment,
        // background, indentation) so round-tripping the content through
        // save/reload would erase those styles. The full exporter emits
        // BlockNote's `.bn-block-*` class hierarchy with `data-*` attrs —
        // renderable as plain HTML once the BlockNote core stylesheet is
        // imported on the article page.
        const html = await editor.blocksToFullHTML(editor.document)
        onChange(html)
      }, 200)
    }
    editor.onChange(handler)
    return () => {
      if (timer) clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  // Replace the default side menu (which shows both + and drag handle on
  // every block hover) with a drag-handle-only variant. The + button is
  // redundant — an empty line already shows a "/" hint telling the user
  // to invoke the slash menu.
  //
  // Also override the slash-command menu's floating positioning:
  // BlockNote's default `autoPlacement` shrinks the menu as the cursor
  // approaches the scroll container's bottom edge instead of flipping it
  // above the cursor. Replacing the middleware with `flip` gives us proper
  // "flip once bottom doesn't fit" behaviour, and the `size` middleware
  // caps the menu at a reasonable height rather than the tiny available
  // space so the internal scroll (see `.bn-suggestion-menu` in
  // globals.css) can kick in.
  const slashMenuFloatingOptions = {
    useFloatingOptions: {
      placement: 'bottom-start' as const,
      middleware: [
        offset(10),
        flip({ fallbackPlacements: ['top-start'], padding: 10 }),
        shift({ padding: 10 }),
        size({
          apply({ elements, availableHeight }) {
            elements.floating.style.maxHeight = `${Math.max(
              180,
              Math.min(availableHeight, 420),
            )}px`
          },
          padding: 10,
        }),
      ],
    },
  }

  // ProseMirror inserts a plain ASCII space on the " " key, and when the
  // block HTML is round-tripped through `blocksToFullHTML` and
  // `tryParseHTMLToBlocks` the HTML parser collapses leading/repeated
  // spaces — so typing spaces at the start of a line ends up invisible
  // after save/reload. Intercept space keydown and insert a NBSP
  // (\u00A0) instead when the caret is at the very start of a block's
  // content; this preserves both visual rendering and the round-trip.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== ' ') return
    if (e.metaKey || e.ctrlKey || e.altKey) return
    if (!editor) return
    // Only intervene for keystrokes inside the main ProseMirror
    // contenteditable. BlockNote also renders <input>/<textarea>
    // elements (image caption / alt-text editor, link panel, etc.) and
    // those need raw spaces — intercepting them here would silently
    // break the caption/title menu the user can summon on an image.
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
    if (!target.closest('.ProseMirror')) return
    const tiptap = editor._tiptapEditor
    const { $from, empty } = tiptap.state.selection
    if (!empty) return
    if ($from.parentOffset !== 0) return
    e.preventDefault()
    tiptap.commands.insertContent('\u00A0')
  }

  return (
    <BlockNoteView
      editor={editor}
      sideMenu={false}
      slashMenu={false}
      data-placeholder={placeholder}
      onKeyDown={onKeyDown}
    >
      <SideMenuController
        sideMenu={(props) => (
          <SideMenu {...props}>
            <DragHandleButton {...props} />
          </SideMenu>
        )}
      />
      <SuggestionMenuController
        triggerCharacter="/"
        floatingUIOptions={slashMenuFloatingOptions}
      />
    </BlockNoteView>
  )
}
