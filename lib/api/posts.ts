import { z } from 'zod'
import { apiFetch, apiFetchServer } from './client'
import {
  PostSchema,
  PostTypeSchema,
  listEnvelope,
  paginated,
} from '@/lib/schemas'

const PaginatedPost = paginated(PostSchema)
const PostTypeList = listEnvelope(PostTypeSchema)
const PopularList = listEnvelope(PostSchema)

export type GetPostsParams = {
  page?: number
  perPage?: number
  tagId?: number
  type?: number
  postType?: number
}

const call = (server: boolean) => (server ? apiFetchServer : apiFetch)

export function getPosts(params: GetPostsParams = {}, server = false) {
  return call(server)('/get-posts/', {
    method: 'POST',
    data: params,
    schema: PaginatedPost,
  })
}

export function getPostsByTag(params: GetPostsParams, server = false) {
  return call(server)('/get-tag-posts/', {
    method: 'POST',
    data: params,
    schema: PaginatedPost,
  })
}

export function getPostsByType(params: GetPostsParams, server = false) {
  return call(server)('/get-type-posts/', {
    method: 'POST',
    data: params,
    schema: PaginatedPost,
  })
}

export function getPost(id: string | number, type?: string | number, server = false) {
  const suffix = type ? `/${type}` : ''
  return call(server)(`/get-post/${id}${suffix}`, { schema: PostSchema })
}

export function getPostType(server = false) {
  return call(server)('/get-post-type/', { schema: PostTypeList })
}

export function getAboutMe(server = false) {
  return call(server)('/get-about-me/', { schema: PostSchema })
}

export function getTopTen(server = false) {
  return call(server)('/get-popu-posts/', { schema: PopularList })
}

export function likePost(id: number) {
  return apiFetch(`/like-post/${id}`, { schema: PostSchema })
}

export function cancelLikePost(id: number) {
  return apiFetch(`/cancel-like-post/${id}`, { schema: PostSchema })
}

export function savePost(data: Record<string, unknown>) {
  return apiFetch('/save-post/', {
    method: 'POST',
    data,
    schema: PostSchema,
  })
}

export function addPost(type: number) {
  return apiFetch(`/add-post/${type}`, { schema: PostSchema })
}

export function deletePost(id: number) {
  return apiFetch(`/delete-post/${id}`)
}

const QiniuTokenSchema = z.object({
  token: z.string(),
  domain: z.string(),
})
export function getFileUploadToken(filename: string) {
  return apiFetch(`/get-qiniu-token/${filename}`, { schema: QiniuTokenSchema })
}
