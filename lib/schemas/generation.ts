import { z } from 'zod'
import { aiDigestDetailSchema, aiDigestGroupSchema } from './ai-digest'

const model = z.object({ baseUrl: z.string(), model: z.string(), credentialRef: z.string(), timeout: z.number() })
export const generationConfigSchema = z.object({
  timezone: z.string(), generateTime: z.string(), publishTime: z.string(), lateMinutes: z.number(),
  maxRetries: z.number(), autoPublish: z.boolean(), sourceIds: z.array(z.number()),
  lookbackHours: z.number(), maxLookbackHours: z.number(), minChars: z.number(), maxChars: z.number(), maxItems: z.number(),
  digestGroups: z.array(aiDigestGroupSchema),
  prompt: z.string(), imagePrompt: z.string(), textModel: model.extend({ provider: z.enum(['openai_compatible', 'codex']).default('openai_compatible') }),
  imageModel: model.extend({ size: z.string(), responseFormat: z.string() }),
})
export const jobSchema = z.object({
  id: z.number(), taskId: z.number(), versionId: z.number(), environment: z.string(), edition: z.string(),
  purpose: z.string(), status: z.string(), stage: z.string(), attempt: z.number(),
  errorCode: z.string().nullable(), errorMessage: z.string().nullable(),
  nextAttemptAt: z.string(), deadlineAt: z.string(), createdAt: z.string(), updatedAt: z.string(),
})
export const jobDetailSchema = jobSchema.extend({ checkpoint: z.record(z.string(), z.unknown()), runs: z.array(z.object({
  id: z.number(), attempt: z.number(), status: z.string(), stage: z.string(), errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(), result: z.record(z.string(), z.unknown()), startedAt: z.string(), finishedAt: z.string().nullable(),
})) })
export const taskSchema = z.object({
  id: z.number(), name: z.string(), contentType: z.string(), channel: z.string(), environment: z.string(),
  enabled: z.boolean(), version: z.number(), config: generationConfigSchema, nextGenerateAt: z.string().nullable(),
  nextPublishAt: z.string().nullable(), missingConfiguration: z.array(z.string()), lastJob: jobSchema.nullable(),
})
export const sourceSchema = z.object({ id: z.number(), name: z.string(), kind: z.string(), endpointUrl: z.string(), titleKeywords: z.array(z.string()).default([]), enabled: z.boolean(), priority: z.number(), lastSuccessAt: z.string().nullable(), lastError: z.string().nullable() })
export const taskListSchema = z.object({ list: z.array(taskSchema) })
export const sourceListSchema = z.object({ list: z.array(sourceSchema) })
export const jobListSchema = z.object({ list: z.array(jobSchema), total: z.number(), page: z.number() })
export const generationMetaSchema = z.object({ today: z.string(), defaultConfig: generationConfigSchema, contentTypes: z.array(z.object({ value: z.string(), label: z.string(), channel: z.string() })), heartbeats: z.array(z.object({ role: z.string(), environment: z.string(), lastSeenAt: z.string(), healthy: z.boolean() })) })
export const managedContentSchema = z.object({
  id: z.number(), title: z.string(), summary: z.string(), channel: z.string(), channelTitle: z.string(), createdAt: z.string(), publishedAt: z.string().nullable(), contentType: z.string(), edition: z.string(),
  status: z.enum(['draft', 'ready', 'published', 'withdrawn']), currentRevision: z.number(), publishedRevision: z.number().nullable(),
  legacyDigestId: z.number().nullable(), scheduledPublishAt: z.string(), updatedAt: z.string(),
  readTimes: z.number().int().nonnegative().default(0),
  cover: aiDigestDetailSchema.shape.content.shape.cover.nullable(), validated: z.boolean(),
})
export const managedContentDetailSchema = managedContentSchema.extend({
  document: z.object({ title: z.string(), summary: z.string(), content: aiDigestDetailSchema.shape.content,
    sources: z.array(z.record(z.string(), z.unknown())), sourceWindowStart: z.string(), sourceWindowEnd: z.string() }).passthrough(),
  revisions: z.array(z.object({ revision: z.number(), origin: z.string(), runId: z.number().nullable(), jobId: z.number().nullable(), createdAt: z.string(), validated: z.boolean() })),
})
export const managedContentListSchema = z.object({ list: z.array(managedContentSchema), total: z.number(), page: z.number() })
export type GenerationTask = z.infer<typeof taskSchema>
export type GenerationSource = z.infer<typeof sourceSchema>
export type GenerationJob = z.infer<typeof jobSchema>
export type GenerationJobDetail = z.infer<typeof jobDetailSchema>
export type ManagedContentDetail = z.infer<typeof managedContentDetailSchema>
