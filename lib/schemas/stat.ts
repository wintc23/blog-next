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
