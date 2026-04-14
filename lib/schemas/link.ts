import { z } from 'zod'

export const LinkSchema = z.object({
  id: z.number(),
  title: z.string(),
  link: z.string(),
  logo: z.string().nullish(),
  motto: z.string().nullish(),
  hide: z.boolean().optional(),
  authorId: z.number().nullish(),
})
export type Link = z.infer<typeof LinkSchema>
