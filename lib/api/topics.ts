import { apiFetch, apiFetchServer } from './client'
import { TopicSchema, listEnvelope } from '@/lib/schemas'

const TopicList = listEnvelope(TopicSchema)

export function getTopicList(server = false) {
  return (server ? apiFetchServer : apiFetch)('/get-topics/', { schema: TopicList })
}

export function addTopic(data: { title: string }) {
  return apiFetch('/add-topic/', { method: 'POST', data })
}

export function updateTopic(data: { id: number; title: string }) {
  return apiFetch('/update-topic/', { method: 'POST', data })
}

export function deleteTopic(id: number) {
  return apiFetch(`/delete-topic/${id}`)
}
