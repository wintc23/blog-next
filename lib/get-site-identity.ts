import { cache } from 'react'
import { getPersonalProfile } from './api/personal-profile'
import { siteIdentityFromProfile } from './site-identity'

// Request-scoped deduplication; the API uses no-store so edits appear on reload.
export const getSiteIdentity = cache(async () => {
  const profile = await getPersonalProfile(true).catch(() => null)
  return siteIdentityFromProfile(profile)
})
