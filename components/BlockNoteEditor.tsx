'use client'

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { Select } from 'antd'
import { BlockNoteView } from '@blocknote/mantine'
import {
  useCreateBlockNote,
  SideMenu,
  SideMenuController,
  DragHandleButton,
  SuggestionMenuController,
} from '@blocknote/react'
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  createCodeBlockSpec,
  type Block,
} from '@blocknote/core'
import { zh } from '@blocknote/core/locales'
import { flip, offset, shift, size } from '@floating-ui/react'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'

// Configure BlockNote's default code block with the languages we care
// about plus a Shiki-backed highlighter so the editor renders real
// syntax colours. Dynamic-import Shiki's `createHighlighter` so it's
// loaded on demand (Shiki's WASM + grammar payloads are heavy — no
// point blocking the initial editor render for it).
const CODE_LANGUAGES: Record<string, { name: string; aliases?: string[] }> = {
  text: { name: 'Plain Text', aliases: ['plain'] },
  javascript: { name: 'JavaScript', aliases: ['js'] },
  typescript: { name: 'TypeScript', aliases: ['ts'] },
  jsx: { name: 'JSX' },
  tsx: { name: 'TSX' },
  html: { name: 'HTML' },
  css: { name: 'CSS' },
  scss: { name: 'SCSS' },
  json: { name: 'JSON' },
  yaml: { name: 'YAML', aliases: ['yml'] },
  markdown: { name: 'Markdown', aliases: ['md'] },
  python: { name: 'Python', aliases: ['py'] },
  go: { name: 'Go' },
  rust: { name: 'Rust', aliases: ['rs'] },
  java: { name: 'Java' },
  c: { name: 'C' },
  cpp: { name: 'C++', aliases: ['c++', 'cc'] },
  csharp: { name: 'C#', aliases: ['cs'] },
  php: { name: 'PHP' },
  ruby: { name: 'Ruby', aliases: ['rb'] },
  swift: { name: 'Swift' },
  kotlin: { name: 'Kotlin', aliases: ['kt'] },
  sql: { name: 'SQL' },
  bash: { name: 'Bash', aliases: ['sh', 'shell'] },
  dockerfile: { name: 'Dockerfile' },
  nginx: { name: 'Nginx' },
  vue: { name: 'Vue' },
  xml: { name: 'XML' },
  diff: { name: 'Diff' },
  ini: { name: 'INI' },
}

// Minimal warmup set passed to shiki's createHighlighter. Loading all
// 28 supported languages upfront was visibly slow (~1–2 s delay before
// the first code block colourised); BlockNote's plugin calls
// `highlighter.loadLanguage(lang)` on demand for anything not in this
// list, so we keep the initial payload small with the two or three
// languages you type most often, and pay a small per-language cost
// only when a different one first appears.
const EDITOR_PRELOAD_LANGS = ['javascript', 'typescript', 'bash']

// BlockNote renders the code block's language picker as a sibling
// `<div contenteditable="false"><select>…</select></div>` inside the
// codeBlock container. `blocksToFullHTML` serialises the DOM verbatim,
// so that UI element leaks into stored body HTML — the reader page
// then displays a functional language switcher (not what we want) and
// the extra wrapper throws off the SSR shiki regex that expects
// `<pre>` immediately after the codeBlock div. Strip it on the way
// out so storage stays clean.
function sanitizeCodeBlockHtml(html: string): string {
  return html.replace(
    /(<div[^>]*data-content-type="codeBlock"[^>]*>)\s*<div[^>]*contenteditable="false"[^>]*>[\s\S]*?<\/div>(?=\s*<pre)/g,
    '$1',
  )
}

// Match the reader-side SSR theme (see lib/highlight-code.ts) so WYSIWYG
// colours line up with what visitors eventually see.
const EDITOR_THEME = 'github-dark'

const editorSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    codeBlock: createCodeBlockSpec({
      defaultLanguage: 'text',
      supportedLanguages: CODE_LANGUAGES,
      createHighlighter: () =>
        import('shiki').then(({ createHighlighter }) =>
          createHighlighter({
            themes: [EDITOR_THEME],
            langs: EDITOR_PRELOAD_LANGS,
          }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ) as unknown as Promise<any>,
    }),
  },
})

// Sorted alphabetically by display name so the dropdown reads naturally
// (Bash, C, C++, …) instead of in the insertion order above.
const LANG_OPTIONS = Object.entries(CODE_LANGUAGES)
  .map(([value, { name }]) => ({ value, label: name }))
  .sort((a, b) => a.label.localeCompare(b.label))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEditor = any

// Overlay-based language picker: rendered as a fixed-position AntD Select
// portaled into document.body so we never inject DOM into ProseMirror's
// managed subtree. An earlier approach that appended a mount point next
// to the native <select> caused ProseMirror to treat the extra child as
// an unexpected mutation and rebuild the nodeview on every keystroke,
// which dropped us into an endless mount/unmount cycle. Positioning from
// outside sidesteps that entirely.
function CodeLanguageOverlay({
  editor,
  containerRef,
}: {
  editor: AnyEditor
  containerRef: React.RefObject<HTMLDivElement | null>
}) {
  const [blockIds, setBlockIds] = useState<string[]>([])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let rafId: number | null = null
    const scan = () => {
      rafId = null
      const blocks = Array.from(
        container.querySelectorAll<HTMLElement>(
          '.bn-block-content[data-content-type="codeBlock"]',
        ),
      )
      const ids: string[] = []
      for (const b of blocks) {
        const id = b.closest('[data-id]')?.getAttribute('data-id')
        if (id) ids.push(id)
      }
      setBlockIds((prev) =>
        prev.length === ids.length && prev.every((v, i) => v === ids[i])
          ? prev
          : ids,
      )
    }
    const schedule = () => {
      if (rafId != null) return
      rafId = requestAnimationFrame(scan)
    }

    scan()
    const observer = new MutationObserver(schedule)
    observer.observe(container, { childList: true, subtree: true })
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [containerRef])

  return (
    <>
      {blockIds.map((id) => (
        <CodeLanguageFloater
          key={id}
          editor={editor}
          blockId={id}
          containerRef={containerRef}
        />
      ))}
    </>
  )
}

function CodeLanguageFloater({
  editor,
  blockId,
  containerRef,
}: {
  editor: AnyEditor
  blockId: string
  containerRef: React.RefObject<HTMLDivElement | null>
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [value, setValue] = useState<string>(() => {
    const b = editor.getBlock(blockId)
    return (b?.props?.language as string | undefined) || 'text'
  })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let rafId: number | null = null

    const findAnchor = () =>
      container.querySelector<HTMLElement>(
        `[data-id="${CSS.escape(blockId)}"] .bn-block-content[data-content-type="codeBlock"]`,
      )

    const update = () => {
      rafId = null
      const anchor = findAnchor()
      if (!anchor) {
        setPos(null)
        return
      }
      const r = anchor.getBoundingClientRect()
      setPos({ top: r.top + 6, left: r.left + 16 })
    }
    const schedule = () => {
      if (rafId != null) return
      rafId = requestAnimationFrame(update)
    }

    update()
    const ro = new ResizeObserver(schedule)
    const anchor = findAnchor()
    if (anchor) ro.observe(anchor)
    window.addEventListener('scroll', schedule, true)
    window.addEventListener('resize', schedule)

    // ProseMirror may detach and re-create the anchor element as it
    // re-renders the codeBlock on edits, so recheck position whenever
    // the editor tree mutates as well.
    const mo = new MutationObserver(schedule)
    mo.observe(container, { childList: true, subtree: true })

    return () => {
      if (rafId != null) cancelAnimationFrame(rafId)
      ro.disconnect()
      mo.disconnect()
      window.removeEventListener('scroll', schedule, true)
      window.removeEventListener('resize', schedule)
    }
  }, [blockId, containerRef])

  useEffect(() => {
    const unsub = editor.onChange(() => {
      const b = editor.getBlock(blockId)
      if (!b) return
      const lang = (b.props?.language as string | undefined) || 'text'
      setValue((prev) => (prev === lang ? prev : lang))
    })
    return () => {
      if (typeof unsub === 'function') unsub()
    }
  }, [editor, blockId])

  if (!pos) return null

  return createPortal(
    <div
      className="bn-code-lang-overlay"
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 100 }}
    >
      <Select
        size="small"
        showSearch
        value={value}
        options={LANG_OPTIONS}
        style={{ minWidth: 140 }}
        popupMatchSelectWidth={180}
        filterOption={(input, option) => {
          const q = input.toLowerCase()
          const label = String(option?.label ?? '').toLowerCase()
          const val = String(option?.value ?? '').toLowerCase()
          return label.includes(q) || val.includes(q)
        }}
        onChange={(lang) => {
          setValue(lang)
          editor.updateBlock(blockId, { props: { language: lang } })
        }}
      />
    </div>,
    document.body,
  )
}

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
  /**
   * Fires when the user presses ArrowUp with the caret at the very start of
   * the first block. The parent can use this to hand focus back to a title
   * input that sits above the editor, so the vertical arrow navigation
   * reads as a continuous document (title ↔ body).
   */
  onEscapeTop?: () => void
}

/**
 * Imperative handle for the parent so it can route blank-area clicks in the
 * surrounding layout to focus the end of the document. Needed because the
 * editor itself only occupies its content height — blank space below it
 * lives in the parent's flex layout.
 */
export interface BlockNoteEditorRef {
  focusEnd: () => void
  focusStart: () => void
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
// Legacy editors wrote code block language on `<pre class="...">` in a
// handful of different formats (Prism: `language-X`; highlight.js:
// `hljs X`; SyntaxHighlighter: `brush: X`). BlockNote's codeBlock
// parser only inspects the inner `<code>`'s class, so every one of
// those hints would be dropped during the one-shot migration. Detect
// the language from the `<pre>` class and hoist it onto `<code>` as
// `language-X` before handing off to BlockNote.
const LEGACY_LANG_FIXUPS: Record<string, string> = {
  markup: 'html',
  sh: 'bash',
  shell: 'bash',
  plain: 'text',
  plaintext: 'text',
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  'c++': 'cpp',
  cs: 'csharp',
  rb: 'ruby',
  kt: 'kotlin',
  rs: 'rust',
  yml: 'yaml',
  md: 'markdown',
  django: 'html',
  jinja: 'html',
}
// Tokens we should NOT treat as language names when surveying a
// pre class — they're presentation / tooling markers that showed up
// alongside real language hints in legacy markup.
const LANG_NOISE_TOKENS = new Set([
  'hljs',
  'highlight',
  'syntaxbox',
  'prettyprint',
  'prism',
  'notranslate',
  'linenums',
  'line-numbers',
])
function extractLegacyLanguage(preClass: string): string | null {
  // 1) Prism-style `language-X` wins if present.
  const prism = preClass.match(/\blanguage-([\w+-]+)/i)
  if (prism) return (LEGACY_LANG_FIXUPS[prism[1].toLowerCase()] || prism[1].toLowerCase())
  // 2) SyntaxHighlighter-style `brush: X`.
  const brush = preClass.match(/\bbrush\s*:\s*([\w+-]+)/i)
  if (brush) return (LEGACY_LANG_FIXUPS[brush[1].toLowerCase()] || brush[1].toLowerCase())
  // 3) highlight.js — `hljs X` / `X hljs`. Pick the token that's
  // neither `hljs` nor presentation noise.
  const tokens = preClass.split(/\s+/).filter(Boolean).map((t) => t.toLowerCase())
  if (tokens.includes('hljs')) {
    for (const tok of tokens) {
      if (tok === 'hljs' || LANG_NOISE_TOKENS.has(tok)) continue
      return LEGACY_LANG_FIXUPS[tok] || tok
    }
  }
  return null
}
function hoistLegacyCodeLanguage(html: string): string {
  return html.replace(
    /<pre([^>]*)\bclass="([^"]*)"([^>]*)>\s*<code\b([^>]*)>/gi,
    (match, preAttrsBefore, preClass, preAttrsAfter, codeAttrs) => {
      const lang = extractLegacyLanguage(preClass)
      if (!lang) return match
      // Preserve any existing class on <code>; append the language
      // one unless <code> already carries a language hint.
      const existingClass = codeAttrs.match(/\bclass="([^"]*)"/i)
      let newCodeAttrs: string
      if (existingClass) {
        if (/language-/i.test(existingClass[1])) {
          newCodeAttrs = codeAttrs
        } else {
          newCodeAttrs = codeAttrs.replace(
            /\bclass="([^"]*)"/i,
            `class="$1 language-${lang}"`,
          )
        }
      } else {
        newCodeAttrs = `${codeAttrs} class="language-${lang}"`
      }
      return `<pre${preAttrsBefore}${preAttrsAfter}><code${newCodeAttrs}>`
    },
  )
}

// Dev-only: expose `window.__bnMigrate(html)` so the legacy → BlockNote
// migration script can drive `tryParseHTMLToBlocks` + the full HTML
// serializer without mounting the editor UI. Gated behind the dev
// build to keep the helper out of production bundles (the one-shot
// migration is already done).
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__bnMigrate = async (html: string) => {
    const { BlockNoteEditor: Core } = await import('@blocknote/core')
    const scratch = Core.create({ schema: editorSchema })
    const preprocessed = hoistLegacyCodeLanguage(html || '')
    const blocks = await scratch.tryParseHTMLToBlocks(preprocessed)
    let out = await scratch.blocksToFullHTML(blocks)
    out = sanitizeCodeBlockHtml(out)
    return { html: out, blocks }
  }
}

const BlockNoteEditor = forwardRef<BlockNoteEditorRef, Props>(
  function BlockNoteEditor({ value, onChange, placeholder, uploadFile, onEscapeTop }, ref) {
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
        // Scratch editor uses the same custom schema so codeBlock
        // language detection survives the HTML → blocks round trip.
        const scratch = Core.create({ schema: editorSchema })
        // Recover language hints from legacy Prism-style HTML (where
        // language sat on `<pre class="...">`, not on `<code>`) before
        // handing off to BlockNote's parser.
        const blocks = await scratch.tryParseHTMLToBlocks(hoistLegacyCodeLanguage(value))
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
        onEscapeTop={onEscapeTop}
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
  onEscapeTop,
  forwardedRef,
}: {
  initialContent: Block[] | undefined
  onChange: (html: string) => void
  placeholder?: string
  uploadFile?: (file: File) => Promise<string>
  onEscapeTop?: () => void
  forwardedRef: React.Ref<BlockNoteEditorRef>
}) {
  const editor = useCreateBlockNote({
    schema: editorSchema,
    initialContent: initialContent && initialContent.length > 0 ? initialContent : undefined,
    dictionary: zh,
    uploadFile,
  })

  const containerRef = useRef<HTMLDivElement>(null)

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
      focusStart: () => {
        if (!editor) return
        const doc = editor.document
        const first = doc[0]
        if (first) editor.setTextCursorPosition(first, 'start')
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
        let html = await editor.blocksToFullHTML(editor.document)
        html = sanitizeCodeBlockHtml(html)
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
    if (e.metaKey || e.ctrlKey || e.altKey) return
    if (!editor) return
    const target = e.target as HTMLElement
    // BlockNote also renders <input>/<textarea> elements (image caption
    // / link panel, etc.); those need default key behaviour so their
    // panels/captions work normally.
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
    if (!target.closest('.ProseMirror')) return
    const tiptap = editor._tiptapEditor
    const { $from, empty } = tiptap.state.selection

    // ArrowUp at the very top of the first block → escape upward so a
    // title input above the editor can take focus. Gate on:
    //  - a collapsed selection (nothing actually highlighted)
    //  - caret at the first block in the document
    //  - caret on the first visual line of that block (textOffset 0 is
    //    enough for most single-line blocks; longer blocks fall through
    //    and scroll naturally).
    if (e.key === 'ArrowUp' && onEscapeTop && empty) {
      const doc = editor.document
      const currentBlock = editor.getTextCursorPosition().block
      if (doc[0] && currentBlock.id === doc[0].id && $from.parentOffset === 0) {
        e.preventDefault()
        onEscapeTop()
        return
      }
    }

    // ProseMirror inserts a plain ASCII space on the " " key, and when
    // the block HTML round-trips through `blocksToFullHTML` and
    // `tryParseHTMLToBlocks` the HTML parser collapses leading/repeated
    // spaces — so typing spaces at the start of a line ends up invisible
    // after save/reload. Insert a NBSP (\u00A0) instead when the caret
    // is at the very start of a block's content.
    if (e.key === ' ') {
      if (!empty) return
      if ($from.parentOffset !== 0) return
      e.preventDefault()
      tiptap.commands.insertContent('\u00A0')
    }
  }

  return (
    <div ref={containerRef} className="contents">
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
      <CodeLanguageOverlay editor={editor} containerRef={containerRef} />
    </div>
  )
}
