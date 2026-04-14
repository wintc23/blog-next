import { z } from 'zod'
import { CommentSchema } from './comment'

// before/after may point to hidden draft posts whose title is null.
// Coerce to empty string so the surrounding PostSchema parse doesn't fail.
const PostRefSchema = z.object({
  id: z.number(),
  title: z
    .string()
    .nullish()
    .transform((v) => v ?? ''),
})

export const PostSchema = z
  .object({
    id: z.number(),
    // Backend may return null title for draft/empty posts created via
    // `/add-post/`. Coerce to empty string at the schema boundary.
    title: z
      .string()
      .nullish()
      .transform((v) => v ?? ''),
    abstract: z.string().nullish(),
    abstractImage: z.string().nullish(),
    bodyHtml: z.string().nullish(),
    timestamp: z.number(),
    readTimes: z.number().default(0),
    likes: z.number().default(0),
    like: z.boolean().optional(),
    commentTimes: z.number().default(0),
    // The single-post endpoint returns `type_id` / `topic_id`, while the
    // list endpoints return `type` / `topic`. Accept both and normalize
    // into `typeId` / `topicId` in the transform below.
    typeId: z.number().nullish(),
    type: z.number().nullish(),
    topicId: z.number().nullish(),
    topic: z.number().nullish(),
    tags: z.array(z.number()).default([]),
    keywords: z.string().nullish(),
    description: z.string().nullish(),
    hide: z.boolean().optional(),
    authorId: z.number().nullish(),
    before: PostRefSchema.nullish(),
    after: PostRefSchema.nullish(),
    comments: z.array(CommentSchema).optional(),
  })
  .transform(({ type, topic, typeId, topicId, ...rest }) => ({
    ...rest,
    typeId: typeId ?? type ?? null,
    topicId: topicId ?? topic ?? null,
  }))
export type Post = z.infer<typeof PostSchema>

// Backend returns `special: 0|1` (int) not a real boolean, same for `hide`.
// Accept both forms and coerce.
const intBool = z
  .union([z.boolean(), z.number()])
  .nullish()
  .transform((v) => (v == null ? null : !!v))

/**
 * Partial post update returned by mutation endpoints like `/like-post/N`,
 * `/cancel-like-post/N`, `/add-comment/`. The client merges the returned
 * fields into its local Post state — none of the full Post fields are
 * required to be present.
 */
export const PostUpdateSchema = z.object({
  id: z.number().optional(),
  like: z.boolean().optional(),
  likes: z.number().optional(),
  commentTimes: z.number().optional(),
  comments: z.array(CommentSchema).optional(),
})
export type PostUpdate = z.infer<typeof PostUpdateSchema>

export const PostTypeSchema = z.object({
  id: z.number(),
  name: z.string(),
  sort: z.number().nullish(),
  default: z.boolean().nullish(),
  special: intBool,
  hide: intBool,
})
export type PostType = z.infer<typeof PostTypeSchema>
