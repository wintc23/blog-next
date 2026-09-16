import { apiFetch, apiFetchServer } from './client'
import { PersonalProfileSchema, type PersonalProfileInput } from '@/lib/schemas/personal-profile'

export function getPersonalProfile(server = false) {
  return (server ? apiFetchServer : apiFetch)('/personal-profile/', {
    schema: PersonalProfileSchema,
    cache: 'no-store',
  })
}

export function savePersonalProfile(data: PersonalProfileInput) {
  return apiFetch('/personal-profile/', {
    method: 'PUT',
    data,
    schema: PersonalProfileSchema,
  })
}
