import type { PersonalProfile } from './schemas/personal-profile'

/** Shared by server metadata and client UI; specific names only come from data. */
export function siteIdentityFromProfile(profile: PersonalProfile | null) {
  const title = profile?.siteName.trim() || '个人网站'
  const displayName = profile?.displayName.trim() || ''
  const slogon = profile?.tagline.trim() || ''
  return {
    title,
    displayName,
    slogon,
    description: [title, slogon].filter(Boolean).join('，') + '。',
    keywords: [title, displayName, '编程,JS,HTML,CSS,Python,技术博客'].filter(Boolean).join(','),
  }
}
