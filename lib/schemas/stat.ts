import { z } from 'zod'

export const SiteStatSummarySchema = z.object({
  visitCount: z.number().default(0),
  visitorCount: z.number().default(0),
  visitStartDate: z.string().nullish(),
})
export type SiteStatSummary = z.infer<typeof SiteStatSummarySchema>

export const StatReportRowSchema = z.object({
  bucket: z.string(),
  pv: z.number(),
  uv: z.number(),
})
export type StatReportRow = z.infer<typeof StatReportRowSchema>

export const StatReportSummarySchema = z.object({
  totalPv: z.number().default(0),
  totalUv: z.number().default(0),
})
export type StatReportSummary = z.infer<typeof StatReportSummarySchema>

export const StatReportSchema = z.object({
  list: z.array(StatReportRowSchema),
  summary: StatReportSummarySchema.optional(),
})
export type StatReport = z.infer<typeof StatReportSchema>

const AnalyticsMetricsSchema = z.object({
  pv: z.number().default(0),
  uv: z.number().default(0),
  sessions: z.number().default(0),
  comments: z.number().default(0),
  messages: z.number().default(0),
  likes: z.number().default(0),
  pendingComments: z.number().default(0),
  pendingMessages: z.number().default(0),
})

const AnalyticsTrendRowSchema = z.object({
  bucket: z.string(),
  pv: z.number(),
  uv: z.number(),
  comments: z.number(),
  messages: z.number(),
  likes: z.number(),
})

const AnalyticsPageRowSchema = z.object({
  path: z.string(),
  pv: z.number(),
  uv: z.number(),
})

const AnalyticsContentRowSchema = AnalyticsPageRowSchema.extend({
  id: z.number(),
  type: z.enum(['article', 'product']),
  title: z.string(),
  comments: z.number(),
  likes: z.number(),
  interactionRate: z.number(),
  linkClicks: z.number().default(0),
  linkConversionRate: z.number().default(0),
})

const AnalyticsSourceRowSchema = z.object({
  name: z.string(),
  pv: z.number(),
  uv: z.number(),
  percentage: z.number(),
})

const AnalyticsProductLinkRowSchema = z.object({
  productId: z.number(),
  productName: z.string(),
  linkKey: z.string(),
  linkLabel: z.string(),
  location: z.string(),
  clicks: z.number(),
  uv: z.number(),
  conversionRate: z.number(),
})

export const AnalyticsDashboardSchema = z.object({
  range: z.object({ start: z.string(), end: z.string() }),
  metrics: AnalyticsMetricsSchema,
  changes: z.record(z.string(), z.number()).default({}),
  trend: z.array(AnalyticsTrendRowSchema),
  topPages: z.array(AnalyticsPageRowSchema),
  topContent: z.array(AnalyticsContentRowSchema),
  sources: z.array(AnalyticsSourceRowSchema),
  productLinks: z.array(AnalyticsProductLinkRowSchema).default([]),
  interaction: z.object({
    comments: z.number(),
    commentReplies: z.number(),
    messages: z.number(),
    messageReplies: z.number(),
    likes: z.number(),
    pendingComments: z.number(),
    pendingMessages: z.number(),
  }),
})

export type AnalyticsDashboard = z.infer<typeof AnalyticsDashboardSchema>
