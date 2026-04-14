import { apiFetch, apiFetchServer } from './client'
import { MessageSchema, listEnvelope, paginated } from '@/lib/schemas'

const PaginatedMessage = paginated(MessageSchema)
const MessageList = listEnvelope(MessageSchema)

export function getMessages(
  data: { page?: number; perPage?: number },
  server = false,
) {
  return (server ? apiFetchServer : apiFetch)('/get-messages/', {
    method: 'POST',
    data,
    schema: PaginatedMessage,
  })
}

export function addMessage(data: { body: string; responseId?: number }) {
  return apiFetch('/add-message/', {
    method: 'POST',
    data,
    schema: MessageSchema,
  })
}

export function getMessageDetail(id: string | number, server = false) {
  return (server ? apiFetchServer : apiFetch)(`/get-message-detail/${id}`, {
    schema: MessageList,
  })
}

export function deleteMessage(id: number) {
  return apiFetch(`/delete-message/${id}`)
}

export function setMessageShow(id: number) {
  return apiFetch(`/set-message-show/${id}`)
}

export function getHideMessage(data: { page?: number }) {
  return apiFetch('/get-hide-messages/', {
    method: 'POST',
    data,
    schema: PaginatedMessage,
  })
}
