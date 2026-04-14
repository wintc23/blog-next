import { z } from 'zod'
import { apiFetch, apiFetchServer } from './client'
import {
  UserSchema,
  UserDetailSchema,
  LoginResponseSchema,
  listEnvelope,
} from '@/lib/schemas'

const UserList = listEnvelope(UserSchema)
const CheckAdmin = z.object({ admin: z.boolean() })

export function githubLogin(code: string) {
  return apiFetch(`/github-login/${code}`, { schema: LoginResponseSchema })
}

export function qqLogin(data: { code: string; redirect: string }) {
  return apiFetch('/qq-login/', {
    method: 'POST',
    data,
    schema: LoginResponseSchema,
  })
}

export function getUserInfoByToken() {
  return apiFetch('/get-self/', { schema: UserSchema })
}

export function getUserInfoById(id: number) {
  return apiFetch(`/get-user/${id}`, { schema: UserSchema })
}

export function getUserDetail(id: number) {
  return apiFetch(`/get-user-detail/${id}`, { schema: UserDetailSchema })
}

export function getAdminInfo(server = false) {
  return (server ? apiFetchServer : apiFetch)('/get-user-info/', {
    schema: UserSchema,
  })
}

export function checkAdmin() {
  return apiFetch('/check-admin/', { schema: CheckAdmin })
}

export function setEmail(data: { userId: number; email: string }) {
  return apiFetch('/set-email/', { method: 'POST', data })
}

export function searchUsers(keyword: string) {
  return apiFetch('/search-user/', {
    method: 'POST',
    data: { keyword },
    schema: UserList,
  })
}
