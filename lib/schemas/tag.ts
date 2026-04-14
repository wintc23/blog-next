import { z } from 'zod'

export const TagSchema = z.object({
  id: z.number(),
  title: z.string(),
  postCount: z.number().default(0),
})
export type Tag = z.infer<typeof TagSchema>

export const TopicSchema = z.object({
  id: z.number(),
  title: z.string(),
  postCount: z.number().default(0),
})
export type Topic = z.infer<typeof TopicSchema>
