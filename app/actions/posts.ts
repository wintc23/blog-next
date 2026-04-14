'use server'

import { revalidatePath } from 'next/cache'
import { apiFetchServer } from '@/lib/api/client'
import { PostSchema, PostUpdateSchema } from '@/lib/schemas'
import type { Post, PostUpdate } from '@/lib/schemas'
import { runAction } from './result'

export async function likePostAction(id: number) {
  return runAction(async () => {
    const data = await apiFetchServer(`/like-post/${id}`, {
      schema: PostUpdateSchema,
    })
    revalidatePath(`/article/${id}`)
    return data as PostUpdate
  })
}

export async function cancelLikePostAction(id: number) {
  return runAction(async () => {
    const data = await apiFetchServer(`/cancel-like-post/${id}`, {
      schema: PostUpdateSchema,
    })
    revalidatePath(`/article/${id}`)
    return data as PostUpdate
  })
}

export async function savePostAction(data: Record<string, unknown>) {
  return runAction(async () => {
    // `/save-post/` returns `{ message, notify }` — not a full Post. Skip
    // response schema validation and just pass the submitted data's id
    // through for downstream `revalidatePath`.
    await apiFetchServer('/save-post/', {
      method: 'POST',
      data,
    })
    const id = data.id as number | undefined
    revalidatePath('/')
    if (id) revalidatePath(`/article/${id}`)
    revalidatePath('/manage')
    return undefined
  })
}

export async function addPostAction(type: number) {
  return runAction(async () => {
    const post = await apiFetchServer(`/add-post/${type}`, { schema: PostSchema })
    revalidatePath('/manage')
    return post as Post
  })
}

export async function deletePostAction(id: number) {
  return runAction(async () => {
    await apiFetchServer(`/delete-post/${id}`)
    revalidatePath('/')
    revalidatePath('/manage')
    revalidatePath(`/article/${id}`)
    return undefined
  })
}
