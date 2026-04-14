'use server'

import { revalidatePath } from 'next/cache'
import { apiFetchServer } from '@/lib/api/client'
import { runAction } from './result'

export async function setEmailAction(data: { userId: number; email: string }) {
  return runAction(async () => {
    await apiFetchServer('/set-email/', { method: 'POST', data })
    revalidatePath('/')
    return undefined
  })
}
