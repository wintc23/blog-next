'use server'

import { revalidatePath } from 'next/cache'
import { apiFetchServer } from '@/lib/api/client'
import type { Link } from '@/lib/schemas'
import { runAction } from './result'

export async function saveLinkAction(data: Partial<Link>) {
  return runAction(async () => {
    const path = data.id ? '/update-link/' : '/add-link/'
    await apiFetchServer(path, { method: 'POST', data })
    revalidatePath('/link')
    revalidatePath('/')
    return undefined
  })
}

export async function deleteLinkAction(id: number) {
  return runAction(async () => {
    await apiFetchServer(`/delete-link/${id}`)
    revalidatePath('/link')
    revalidatePath('/')
    return undefined
  })
}
