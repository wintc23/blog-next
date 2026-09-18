import { z } from 'zod'
import { apiFetch } from './client'

const LikeStateSchema = z.object({ likes: z.number().int().nonnegative(), like: z.boolean() })
export type LikeState = z.infer<typeof LikeStateSchema>
export type LikeTarget = 'post' | 'digest'

function path(target: LikeTarget, id: number) {
  return target === 'post' ? `/posts/${id}/likes/` : `/ai-digests/${id}/likes/`
}

export function getLikeState(target: LikeTarget, id: number, signal?: AbortSignal) {
  return apiFetch(path(target, id), { schema: LikeStateSchema, cache: 'no-store', signal })
}

export function setLiked(target: LikeTarget, id: number, liked: boolean) {
  return apiFetch(path(target, id), { method: liked ? 'POST' : 'DELETE', schema: LikeStateSchema })
}
