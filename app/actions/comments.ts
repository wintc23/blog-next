'use server'

import { revalidatePath } from 'next/cache'
import { apiFetchServer } from '@/lib/api/client'
import { PostUpdateSchema } from '@/lib/schemas'
import type { PostUpdate } from '@/lib/schemas'
import { runAction } from './result'

export async function addCommentAction(input: {
  body: string
  postId: number
  responseId?: number
}) {
  return runAction(async () => {
    const post = await apiFetchServer('/add-comment/', {
      method: 'POST',
      data: input,
      schema: PostUpdateSchema,
    })
    revalidatePath(`/article/${input.postId}`)
    return post as PostUpdate
  })
}

export async function deleteCommentAction(id: number) {
  return runAction(async () => {
    await apiFetchServer(`/delete-comment/${id}`)
    revalidatePath('/manage/comment')
    return undefined
  })
}

export async function setCommentShowAction(id: number) {
  return runAction(async () => {
    await apiFetchServer(`/set-comment-show/${id}`)
    revalidatePath('/manage/comment')
    return undefined
  })
}
