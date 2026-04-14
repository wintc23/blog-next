import { apiFetch, apiFetchServer } from './client'
import { TagSchema, listEnvelope } from '@/lib/schemas'

const TagList = listEnvelope(TagSchema)

export function getTagList(server = false) {
  return (server ? apiFetchServer : apiFetch)('/get-tags/', { schema: TagList })
}

export function addTag(data: { title: string }) {
  return apiFetch('/add-tag/', { method: 'POST', data })
}

export function updateTag(data: { id: number; title: string }) {
  return apiFetch('/update-tag/', { method: 'POST', data })
}

export function deleteTag(id: number) {
  return apiFetch(`/delete-tag/${id}`)
}
