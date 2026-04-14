import type { MetadataRoute } from 'next'
import { apiFetchServer } from '@/lib/api/client'
import { SITE } from '@/lib/config'

interface SitemapInfo {
  posts: { id: number; timestamp?: number }[]
  tags: { id: number }[]
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL || SITE.url || 'http://localhost:8000'
  const now = new Date()

  const routes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/message`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
    { url: `${base}/link`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/recommendation`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ]

  try {
    const data = (await apiFetchServer('/get-sitemap-info/')) as SitemapInfo
    for (const p of data.posts || []) {
      routes.push({
        url: `${base}/article/${p.id}`,
        lastModified: p.timestamp ? new Date(p.timestamp * 1000) : now,
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    }
    for (const t of data.tags || []) {
      routes.push({
        url: `${base}/tag/${t.id}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.6,
      })
    }
  } catch {
    // backend not reachable — return static routes only
  }

  return routes
}
