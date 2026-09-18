export type ContentPart = { type: 'text' | 'link' | 'image' | 'strong'; text: string; url?: string }
export type CommentImage = { url: string; alt: string }

export function splitCommentBody(body: string): { text: string; images: CommentImage[] } {
  const images: CommentImage[] = []
  const text = body.replace(/!\[([^\]\r\n]*)\]\(([^\s()]+)\)/g, (source, alt: string, url: string) => {
    if (!safeImage(url)) return source
    images.push({ url, alt })
    return ''
  })
  return { text: images.length ? text.replace(new RegExp(`\\n{${images.length + 1}}$`), '') : text, images }
}

export function joinCommentBody(text: string, images: CommentImage[]): string {
  return text + (images.length ? '\n\n' + images.map((image) => `![${image.alt.replace(/[\[\]\r\n]/g, '')}](${image.url})`).join('\n') : '')
}

export function safeLink(value: string): boolean {
  if (/[\s\x00-\x1f\x7f<>"'\\]/.test(value)) return false
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && !!url.hostname && !url.username && !url.password
  } catch {
    return false
  }
}

export function safeImage(value: string): boolean {
  if (!safeLink(value)) return false
  const url = new URL(value)
  const base = new URL(process.env.NEXT_PUBLIC_MEDIA_BASE_URL || 'https://file.wintc.top')
  return url.host === base.host && /^\/(?:managed-images\/[a-f0-9]{32}\.(jpg|png|webp)|[a-f0-9]{32}(?:\.(jpg|jpeg|png|webp))?|generated-content\/[a-f0-9]{64}\.png)$/.test(url.pathname)
}

/** Render only these tokens as React elements; never pass user content to HTML. */
export function parseRichContent(body: string): ContentPart[] {
  const parts: ContentPart[] = []
  const tokens = /(!?)\[([^\]\r\n]*)\]\(([^\s()]+)\)|\*\*([^*\n]+)\*\*|https?:\/\/[^\s<>"'\[\]()]+/g
  let position = 0
  for (const match of body.matchAll(tokens)) {
    const index = match.index ?? 0
    if (index > position) parts.push({ type: 'text', text: body.slice(position, index) })
    if (match[3] && (match[1] ? safeImage(match[3]) : safeLink(match[3]))) {
      parts.push({ type: match[1] ? 'image' : 'link', text: match[2], url: match[3] })
    } else if (match[4]) {
      parts.push({ type: 'strong', text: match[4] })
    } else if (!match[3]) {
      const url = match[0].replace(/[.,;!?，。！？；：]+$/, '')
      parts.push(safeLink(url) ? { type: 'link', text: url, url } : { type: 'text', text: url })
      if (url.length < match[0].length) parts.push({ type: 'text', text: match[0].slice(url.length) })
    } else {
      parts.push({ type: 'text', text: match[0] })
    }
    position = index + match[0].length
  }
  if (position < body.length) parts.push({ type: 'text', text: body.slice(position) })
  return parts
}
