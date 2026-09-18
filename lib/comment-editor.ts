import type { JSONContent } from '@tiptap/core'
import Link from '@tiptap/extension-link'
import { parseRichContent, safeLink } from './rich-content'

// Exclude the same mark too: replacing a link must not create nested anchors.
export const CommentLink = Link.extend({ excludes: 'link bold' }).configure({
  openOnClick: false, autolink: true, linkOnPaste: true, defaultProtocol: 'https',
  isAllowedUri: (url) => safeLink(url),
})

/** Keep the existing safe, lightweight comment format on the wire. */
export function commentDocument(text: string): JSONContent {
  return { type: 'doc', content: text.split('\n').map((line) => ({
    type: 'paragraph', content: parseRichContent(line).filter((part) => part.text).map((part) => ({
      type: 'text', text: part.text,
      ...(part.type === 'link' ? { marks: [{ type: 'link', attrs: { href: part.url } }] }
        : part.type === 'strong' ? { marks: [{ type: 'bold' }] } : {}),
    })),
  })) }
}

export function commentText(doc: JSONContent): string {
  const inline = (node: JSONContent): string => {
    if (node.type === 'hardBreak') return '\n'
    const text = node.text ?? (node.content || []).map(inline).join('')
    const link = node.marks?.find((mark) => mark.type === 'link')?.attrs?.href
    if (typeof link === 'string' && safeLink(link)) {
      const url = link.replace(/\(/g, '%28').replace(/\)/g, '%29')
      // Labels containing a closing bracket cannot be represented by this format.
      return text.includes(']') ? text : `[${text}](${url})`
    }
    return node.marks?.some((mark) => mark.type === 'bold') && text && !/[*\n]/.test(text) ? `**${text}**` : text
  }
  return (doc.content || []).map(inline).join('\n')
}
