import { apiFetch, apiFetchServer } from './client'
import { LinkSchema, listEnvelope } from '@/lib/schemas'
import type { Link } from '@/lib/schemas'

const LinkList = listEnvelope(LinkSchema)

export function getLinkList(server = false) {
  return (server ? apiFetchServer : apiFetch)('/get-link-list/', { schema: LinkList })
}

export function getBasicLinkList(server = false) {
  return (server ? apiFetchServer : apiFetch)('/get-basic-link-list/', {
    schema: LinkList,
  })
}

export function addLink(data: Partial<Link>) {
  return apiFetch('/add-link/', { method: 'POST', data })
}

export function updateLink(data: Partial<Link>) {
  return apiFetch('/update-link/', { method: 'POST', data })
}

export function saveLink(data: Partial<Link>) {
  return data.id ? updateLink(data) : addLink(data)
}

export function deleteLink(id: number) {
  return apiFetch(`/delete-link/${id}`)
}

export function checkLink(id: number) {
  return apiFetch(`/check-link/${id}`)
}
