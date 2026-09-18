import { z } from 'zod'
import { apiFetch } from './client'
import { AssetSchema } from '../image-tools'

export const ImageShareSchema = z.object({ name: z.string(), toolSlug: z.string(), outputs: z.array(AssetSchema) })
export type ImageShare = z.infer<typeof ImageShareSchema>

export function getImageShare(token: string, signal?: AbortSignal) {
  return apiFetch(`/image-shares/${encodeURIComponent(token)}/`, { schema: ImageShareSchema, cache: 'no-store', signal })
}
