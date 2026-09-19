import { z } from 'zod'

export const PROFILE_LINK_ICONS = [
  { value: 'link', label: '通用链接' },
  { value: 'github', label: 'GitHub' },
  { value: 'zhihu', label: '知乎' },
  { value: 'weibo', label: '微博' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'sysu', label: '中山大学校徽' },
  { value: 'bytedance', label: '字节跳动 Logo' },
] as const

export const ProfileLinkSchema = z.object({
  label: z.string(),
  url: z.string(),
  group: z.enum(['navigation', 'community', 'education', 'work']).default('navigation'),
  icon: z.enum(PROFILE_LINK_ICONS.map(({ value }) => value)).default('link'),
})

export type ProfileLink = z.infer<typeof ProfileLinkSchema>

export const MOMENT_CATEGORIES = [
  { value: 'mountain', label: '爬山' },
  { value: 'hiking', label: '徒步' },
  { value: 'travel', label: '旅行' },
  { value: 'daily', label: '日常' },
] as const

export const MomentImageSchema = z.object({ url: z.string(), description: z.string().default(''), isPublic: z.boolean().optional() })
export type MomentImage = z.infer<typeof MomentImageSchema>

export const ProfileMomentSchema = z.object({
  id: z.string(),
  date: z.string(),
  category: z.enum(MOMENT_CATEGORIES.map(({ value }) => value)),
  text: z.string(),
  imageUrl: z.string(),
  imageAlt: z.string().default(''),
  location: z.string().default(''),
  occurredAt: z.string().nullable().default(null),
  images: z.array(MomentImageSchema).optional(),
}).transform((moment) => ({
  ...moment,
  images: moment.images ?? (moment.imageUrl ? [{ url: moment.imageUrl, description: moment.imageAlt }] : []),
}))

export type ProfileMoment = z.infer<typeof ProfileMomentSchema>

export const PersonalProfileSchema = z.object({
  id: z.literal(1),
  siteName: z.string().default(''),
  displayName: z.string(),
  avatarUrl: z.string(),
  tagline: z.string(),
  introduction: z.string(),
  bio: z.string(),
  portfolioIntroduction: z.string().default(''),
  contactEmail: z.string().default(''),
  wechatId: z.string().default(''),
  wechatQrUrl: z.string().default(''),
  contactNote: z.string().default(''),
  links: z.array(ProfileLinkSchema),
})

export type PersonalProfile = z.infer<typeof PersonalProfileSchema>
export type PersonalProfileInput = Omit<PersonalProfile, 'id'>
