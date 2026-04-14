import { z } from 'zod'

export const CommentSchema = z.object({
  id: z.number(),
  // Historic rows may have null body (deleted / hidden / legacy data).
  // Coerce to empty string at the schema boundary so downstream UI code
  // can treat `body` as always-string.
  body: z
    .string()
    .nullish()
    .transform((v) => v ?? ''),
  timestamp: z.number(),
  authorId: z.number(),
  responseId: z.number().nullish(),
  hide: z.boolean().optional(),
  postId: z.number().nullish(),
  postTitle: z.string().nullish(),
})
export type Comment = z.infer<typeof CommentSchema>

export const MessageSchema = CommentSchema.extend({
  rootResponseId: z.number().nullish(),
})
export type Message = z.infer<typeof MessageSchema>
