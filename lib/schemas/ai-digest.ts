import { z } from 'zod'

const safeUrl = z.string().url().refine((value) => /^https?:\/\//.test(value), 'Invalid URL')
const imageSchema = z.object({
  url: safeUrl, alt: z.string(), credit: z.string().optional(),
  caption: z.string().optional(), width: z.number().positive().optional(), height: z.number().positive().optional(),
}).passthrough()
const sourceSchema = z.object({
  itemId: z.number(), publisher: z.string(), title: z.string(), url: safeUrl, publishedDate: z.string(),
}).passthrough()
export const aiDigestGroupSchema = z.object({
  id: z.enum(['applications', 'development']), title: z.string().min(1).max(32), description: z.string().min(1).max(200),
})
export const aiDigestSchema = z.object({
  id: z.number(), issueDate: z.string(), title: z.string(), channelTitle: z.string(), slug: z.string(), summary: z.string(),
  status: z.enum(['draft', 'ready', 'published', 'withdrawn']), timezone: z.string(),
  cover: imageSchema.nullable(), scheduledPublishAt: z.string(), publishedAt: z.string().nullable(),
  createdAt: z.string(), updatedAt: z.string(), contentVersion: z.number(),
  readTimes: z.number().int().nonnegative().default(0),
  groups: z.array(aiDigestGroupSchema.extend({ count: z.number().int().positive() })).optional(),
})
const settingsSchema = z.object({ title: z.string(), timezone: z.string(), publishTime: z.string() }).nullable()
export const aiDigestListSchema = z.object({
  list: z.array(aiDigestSchema), total: z.number(), page: z.number(), perPage: z.number(), settings: settingsSchema,
})
export const aiDigestHomeSchema = z.object({
  featured: aiDigestSchema.nullable(), previous: z.array(aiDigestSchema).max(5),
  isToday: z.boolean(), today: z.string(), settings: settingsSchema,
})
export const aiDigestDetailSchema = aiDigestSchema.extend({
  content: z.object({
    schemaVersion: z.union([z.literal(1), z.literal(2)]), byline: z.string(), generationKind: z.string(),
    groups: z.array(aiDigestGroupSchema).optional(),
    takeaways: z.array(z.string()), cover: imageSchema, estimatedReadMinutes: z.number(),
    sections: z.array(z.object({
      id: z.string(), category: z.string(), recency: z.string(), title: z.string(),
      groupId: z.enum(['applications', 'development']).optional(),
      paragraphs: z.array(z.string()), analysis: z.string(), image: imageSchema.optional(),
      sources: z.array(sourceSchema),
    }).passthrough()),
    closing: z.string(), editorialNote: z.string(), scopeNote: z.string(),
  }).passthrough().superRefine((content, ctx) => {
    if (content.schemaVersion !== 2 && !content.groups) return
    if (content.groups?.map(group => group.id).join(',') !== 'applications,development') {
      ctx.addIssue({ code: 'custom', path: ['groups'], message: '阅读分区不完整' })
    }
    content.sections.forEach((section, index) => {
      if (!section.groupId) ctx.addIssue({ code: 'custom', path: ['sections', index, 'groupId'], message: '请选择所属分区' })
    })
  }),
})
export type AiDigest = z.infer<typeof aiDigestSchema>
export type AiDigestDetail = z.infer<typeof aiDigestDetailSchema>
export type AiDigestHome = z.infer<typeof aiDigestHomeSchema>
