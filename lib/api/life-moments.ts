import { z } from 'zod'
import { apiFetch, apiFetchServer } from './client'
import { ProfileMomentSchema, type ProfileMoment } from '@/lib/schemas/personal-profile'

export type LifeMomentInput = Pick<ProfileMoment, 'date' | 'occurredAt' | 'category' | 'text' | 'location' | 'images'>
export const LifeMomentListSchema = z.object({
  list: z.array(ProfileMomentSchema), total: z.number(), page: z.number(), perPage: z.number(),
})

export const LifeMomentGroupsSchema = z.object({
  groups: z.array(z.object({ date: z.string(), moments: z.array(ProfileMomentSchema) })),
  total: z.number(), totalDates: z.number(), page: z.number(), perPage: z.number(),
})

export type LifeMomentGroups = z.infer<typeof LifeMomentGroupsSchema>

export function getLifeMomentGroups(page = 1, server = true, signal?: AbortSignal) {
  return (server ? apiFetchServer : apiFetch)('/life-moments/', {
    params: { page, per_page: 7, group_by: 'date' }, schema: LifeMomentGroupsSchema, cache: 'no-store', signal,
  })
}

export function getLifeMoment(id: string) {
  return apiFetchServer(`/life-moments/${encodeURIComponent(id)}/`, { schema: ProfileMomentSchema, cache: 'no-store' })
}

export function getLifeMoments(page = 1, perPage = 12, server = false) {
  return (server ? apiFetchServer : apiFetch)('/life-moments/', {
    params: { page, per_page: perPage }, schema: LifeMomentListSchema, cache: 'no-store',
  })
}

export function saveLifeMoment(data: LifeMomentInput, id?: string) {
  return apiFetch(id ? `/life-moments/${encodeURIComponent(id)}/` : '/life-moments/', {
    method: id ? 'PUT' : 'POST', data, schema: ProfileMomentSchema,
  })
}

export function deleteLifeMoment(id: string) {
  return apiFetch(`/life-moments/${encodeURIComponent(id)}/`, {
    method: 'DELETE', schema: z.object({ id: z.string(), message: z.string() }),
  })
}
