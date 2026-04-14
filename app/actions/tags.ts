'use server'

import { revalidatePath } from 'next/cache'
import { apiFetchServer } from '@/lib/api/client'
import { runAction } from './result'

function revalidate() {
  revalidatePath('/manage/topic')
  revalidatePath('/')
}

export async function addTagAction(data: { title: string }) {
  return runAction(async () => {
    await apiFetchServer('/add-tag/', { method: 'POST', data })
    revalidate()
    return undefined
  })
}

export async function updateTagAction(data: { id: number; title: string }) {
  return runAction(async () => {
    await apiFetchServer('/update-tag/', { method: 'POST', data })
    revalidate()
    return undefined
  })
}

export async function deleteTagAction(id: number) {
  return runAction(async () => {
    await apiFetchServer(`/delete-tag/${id}`)
    revalidate()
    return undefined
  })
}

export async function addTopicAction(data: { title: string }) {
  return runAction(async () => {
    await apiFetchServer('/add-topic/', { method: 'POST', data })
    revalidate()
    return undefined
  })
}

export async function updateTopicAction(data: { id: number; title: string }) {
  return runAction(async () => {
    await apiFetchServer('/update-topic/', { method: 'POST', data })
    revalidate()
    return undefined
  })
}

export async function deleteTopicAction(id: number) {
  return runAction(async () => {
    await apiFetchServer(`/delete-topic/${id}`)
    revalidate()
    return undefined
  })
}
