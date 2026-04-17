import 'server-only'
import { getSingletonHighlighter, type Highlighter } from 'shiki'

// Languages we're willing to load grammars for. Kept in sync with the
// editor's `CODE_LANGUAGES` list in components/BlockNoteEditor.tsx.
const SUPPORTED_LANGS = new Set([
  'javascript',
  'typescript',
  'jsx',
  'tsx',
  'html',
  'css',
  'scss',
  'json',
  'yaml',
  'markdown',
  'python',
  'go',
  'rust',
  'java',
  'c',
  'cpp',
  'csharp',
  'php',
  'ruby',
  'swift',
  'kotlin',
  'sql',
  'bash',
  'dockerfile',
  'nginx',
  'vue',
  'xml',
  'diff',
  'ini',
])

// Legacy / common aliases → shiki's canonical id. Handles Prism
// language names ("markup" for HTML, etc.) so migrated legacy posts
// pick up highlighting on the reader side.
const LANG_ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  yml: 'yaml',
  md: 'markdown',
  rs: 'rust',
  cs: 'csharp',
  rb: 'ruby',
  kt: 'kotlin',
  'c++': 'cpp',
  cc: 'cpp',
  plain: 'text',
  markup: 'html',
  docker: 'dockerfile',
}

function canonicalLang(raw: string): string | null {
  const lower = (raw || '').toLowerCase()
  const normalised = LANG_ALIASES[lower] || lower
  if (!normalised || normalised === 'text' || normalised === 'plaintext') return null
  return SUPPORTED_LANGS.has(normalised) ? normalised : null
}

// shiki is comfortable holding a few dozen grammars resident on a
// Node server. Reuse a single highlighter across requests so we pay
// the cold-start cost (~200 ms) exactly once per Node process.
const THEME = 'github-dark'
let highlighterPromise: Promise<Highlighter> | null = null
function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = getSingletonHighlighter({
      themes: [THEME],
      langs: ['javascript', 'typescript', 'bash', 'json'],
    })
  }
  return highlighterPromise
}

// Decode the HTML entities shiki needs to see as raw source code.
// We only need the common five — the body HTML passes through
// ProseMirror / TinyMCE, both of which escape these same ones.
function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

// Match BlockNote full-HTML code blocks:
//   <div ... data-content-type="codeBlock" ... data-language="X" ...>
//     <pre><code class="bn-inline-content">...raw escaped source...</code></pre>
//   </div>
// Captures the div opening tag + whitespace, the language, the raw
// (still-escaped) source, and the div closing tag so we can keep the
// outer block wrapper intact and only swap the inner <pre>.
// Match BlockNote full-HTML code blocks, with a lenient middle that
// tolerates the legacy language-picker `<div contenteditable="false">
// <select>…</select></div>` blob older posts may still have in their
// body (newer posts are sanitised on save; see `sanitizeCodeBlockHtml`
// in components/BlockNoteEditor.tsx). The picker blob is discarded
// as part of the replacement.
const BLOCKNOTE_CODE_RE =
  /(<div[^>]*data-content-type="codeBlock"[^>]*data-language="([^"]+)"[^>]*>)\s*(?:<div[^>]*contenteditable="false"[^>]*>[\s\S]*?<\/div>\s*)?<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>(\s*<\/div>)/g

// Match legacy TinyMCE code blocks:
//   <pre class="language-X"><code>...raw escaped source...</code></pre>
// Replaced in full with shiki's output since there's no surrounding
// wrapper to preserve.
const LEGACY_CODE_RE =
  /<pre class="language-([^"]+)"[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/g

interface Job {
  placeholder: string
  kind: 'bn' | 'legacy'
  lang: string
  source: string
  divOpen?: string
  divClose?: string
}

/**
 * Rewrite every code block in the given HTML with a shiki-rendered
 * `<pre>` that has inline colours applied. Pure string in / string
 * out, so it slots into the article page's Server Component without
 * any DOM dependency. Unknown languages are left untouched.
 */
export async function highlightCodeBlocks(html: string): Promise<string> {
  if (!html) return html
  // Quick optimism check — skip the entire pipeline when the body
  // has no code blocks at all. Avoids cold-starting shiki for plain
  // text articles.
  if (!BLOCKNOTE_CODE_RE.test(html) && !LEGACY_CODE_RE.test(html)) {
    return html
  }
  // Reset regex state after the `.test` lookahead above.
  BLOCKNOTE_CODE_RE.lastIndex = 0
  LEGACY_CODE_RE.lastIndex = 0

  const jobs: Job[] = []
  let counter = 0

  // Two-phase rewrite: first replace each code block with a unique
  // placeholder string (so the async highlight work doesn't have to
  // race inside a sync String.replace callback), then substitute the
  // placeholders with shiki output once every job resolves.
  let templated = html.replace(
    BLOCKNOTE_CODE_RE,
    (_m, divOpen: string, rawLang: string, rawCode: string, divClose: string) => {
      const lang = canonicalLang(rawLang)
      if (!lang) return _m
      const placeholder = `\u0000__SHIKI_${counter++}__\u0000`
      jobs.push({
        placeholder,
        kind: 'bn',
        lang,
        source: decodeHtmlEntities(rawCode),
        divOpen,
        divClose,
      })
      return `${divOpen}${placeholder}${divClose}`
    },
  )
  templated = templated.replace(
    LEGACY_CODE_RE,
    (_m, rawLang: string, rawCode: string) => {
      const lang = canonicalLang(rawLang)
      if (!lang) return _m
      const placeholder = `\u0000__SHIKI_${counter++}__\u0000`
      jobs.push({
        placeholder,
        kind: 'legacy',
        lang,
        source: decodeHtmlEntities(rawCode),
      })
      return placeholder
    },
  )

  if (jobs.length === 0) return html

  const highlighter = await getHighlighter()

  // Lazy-load any language we haven't already warmed up with.
  const missingLangs = Array.from(
    new Set(jobs.map((j) => j.lang).filter((l) => !highlighter.getLoadedLanguages().includes(l))),
  )
  if (missingLangs.length > 0) {
    await highlighter.loadLanguage(...(missingLangs as Parameters<typeof highlighter.loadLanguage>))
  }

  const rendered = await Promise.all(
    jobs.map(async (job) => {
      try {
        const out = highlighter.codeToHtml(job.source, {
          lang: job.lang,
          theme: THEME,
        })
        return { job, out }
      } catch {
        return { job, out: null }
      }
    }),
  )

  let result = templated
  for (const { job, out } of rendered) {
    if (!out) {
      // Highlight failed — swap the placeholder back with a safe
      // plain `<pre><code>` so the block still renders as text.
      result = result.replace(
        job.placeholder,
        `<pre><code>${escapeHtml(job.source)}</code></pre>`,
      )
      continue
    }
    if (job.kind === 'bn') {
      // BlockNote: shiki gives us a full `<pre style="...">...</pre>`,
      // drop it inside the preserved .bn-block-outer wrapper so the
      // outer block styling stays consistent with every other block.
      result = result.replace(job.placeholder, out)
    } else {
      // Legacy TinyMCE: shiki's output replaces the whole match.
      result = result.replace(job.placeholder, out)
    }
  }
  return result
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
