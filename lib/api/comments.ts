import { apiFetch } from './client'
import { CommentSchema, PostSchema, listEnvelope, paginated } from '@/lib/schemas'

const CommentList = listEnvelope(CommentSchema)
const PaginatedComment = paginated(CommentSchema)

export function addComment(data: {
  body: string
  postId: number
  responseId?: number
}) {
  return apiFetch('/add-comment/', {
    method: 'POST',
    data,
    schema: PostSchema,
  })
}

/** Admin moderation — paginated comment list. */
export function getCommentsForModeration(data: { page?: number; perPage?: number }) {
  return apiFetch('/get-comments/', {
    method: 'POST',
    data,
    schema: PaginatedComment,
  })
}

/** Public — all comments for a post. */
export function getCommentsForPost(data: { postId: number }) {
  return apiFetch('/get-comments/', {
    method: 'POST',
    data,
    schema: CommentList,
  })
}

export function deleteComment(id: number) {
  return apiFetch(`/delete-comment/${id}`)
}

export function setCommentShow(id: number) {
  return apiFetch(`/set-comment-show/${id}`)
}
