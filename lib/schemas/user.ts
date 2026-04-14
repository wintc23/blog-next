import { z } from 'zod'

export const UserSchema = z.object({
  id: z.number(),
  username: z.string(),
  avatar: z.string(),
  admin: z.boolean().optional(),
  email: z.string().nullish(),
  aboutMe: z.string().nullish(),
  postCount: z.number().nullish(),
  likeCount: z.number().nullish(),
  commentCount: z.number().nullish(),
  messageCount: z.number().nullish(),
})
export type User = z.infer<typeof UserSchema>

const UserActivitySchema = z.object({
  timestamp: z.number(),
  body: z.string().nullish(),
  postId: z.number().nullish(),
  postTitle: z.string().nullish(),
})

export const UserDetailSchema = UserSchema.extend({
  likes: z.array(UserActivitySchema).default([]),
  messages: z.array(UserActivitySchema).default([]),
  comments: z.array(UserActivitySchema).default([]),
})
export type UserDetail = z.infer<typeof UserDetailSchema>

export const LoginResponseSchema = z.object({
  token: z.string(),
})
export type LoginResponse = z.infer<typeof LoginResponseSchema>
