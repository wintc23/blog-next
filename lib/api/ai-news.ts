import 'server-only'
import { cache } from 'react'
import { apiFetch } from './client'
import { aiDigestDetailSchema, aiDigestHomeSchema, aiDigestListSchema } from '@/lib/schemas/ai-digest'

// Public requests deliberately carry no administrator cookie, including metadata.
export const getAiNewsHome = cache(() => apiFetch('/ai-digests/home/', {
  schema: aiDigestHomeSchema, cache: 'no-store',
}))

export const getAiNews = cache((page = 1) => apiFetch('/ai-digests/', {
  params: { page, per_page: 10 }, schema: aiDigestListSchema, cache: 'no-store',
}))

export const getAiNewsDetail = cache((id: number) => apiFetch(`/ai-digests/${id}/`, {
  schema: aiDigestDetailSchema, cache: 'no-store',
}))
