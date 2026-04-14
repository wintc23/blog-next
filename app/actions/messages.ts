'use server'

import { revalidatePath } from 'next/cache'
import { apiFetchServer } from '@/lib/api/client'
import { MessageSchema } from '@/lib/schemas'
import type { Message } from '@/lib/schemas'
import { runAction } from './result'

export async function addMessageAction(input: {
  body: string
  responseId?: number
}) {
  return runAction(async () => {
    const msg = await apiFetchServer('/add-message/', {
      method: 'POST',
      data: input,
      schema: MessageSchema,
    })
    revalidatePath('/message')
    if (input.responseId) revalidatePath(`/message/${input.responseId}`)
    return msg as Message
  })
}

export async function deleteMessageAction(id: number) {
  return runAction(async () => {
    await apiFetchServer(`/delete-message/${id}`)
    revalidatePath('/message')
    revalidatePath('/manage/message')
    return undefined
  })
}

export async function setMessageShowAction(id: number) {
  return runAction(async () => {
    await apiFetchServer(`/set-message-show/${id}`)
    revalidatePath('/message')
    revalidatePath('/manage/message')
    return undefined
  })
}
