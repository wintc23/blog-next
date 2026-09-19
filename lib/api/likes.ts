import { z } from 'zod'
import { apiFetch } from './client'

const LikeStateSchema = z.object({ likes: z.number().int().nonnegative(), like: z.boolean() })
export type LikeState = z.infer<typeof LikeStateSchema>
export type LikeTarget = 'post' | 'digest' | 'moment' | 'tool' | 'image-share'

function path(target: LikeTarget, id: number | string) {
  const routes: Record<LikeTarget, string> = { post: 'posts', digest: 'ai-digests', moment: 'life-moments', tool: 'image-tools', 'image-share': 'image-shares' }
  return `/${routes[target]}/${encodeURIComponent(String(id))}/likes/`
}

export function getLikeState(target: LikeTarget, id: number | string, signal?: AbortSignal) {
  return apiFetch(path(target, id), { schema: LikeStateSchema, cache: 'no-store', signal })
}

export function setLiked(target: LikeTarget, id: number | string, liked: boolean) {
  return apiFetch(path(target, id), { method: liked ? 'POST' : 'DELETE', schema: LikeStateSchema })
}
