import type { Metadata } from 'next'
import { SITE } from './config'
import { formatSiteTitle } from './site-identity'

type ShareImage = { url: string; alt?: string; width?: number; height?: number }

export function shareMetadata({ title, description, path, siteName, image, type = 'website' }: {
  title: string; description: string; path: string; siteName: string; image?: ShareImage; type?: 'website' | 'article'
}): Metadata {
  const url = new URL(path, SITE.url).href
  const imageUrl = new URL(image?.url || SITE.icon, SITE.url).href
  const shareTitle = formatSiteTitle(title, siteName)
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type, title: shareTitle, description, url, siteName, locale: 'zh_CN',
      images: [{ ...image, url: imageUrl, alt: image?.alt || title }],
    },
    twitter: { card: 'summary_large_image', title: shareTitle, description, images: [imageUrl] },
  }
}
